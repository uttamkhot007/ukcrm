/**
 * Invite Tenant Admin
 * --------------------
 * Creates a Cognito user for a tenant admin using their corporate email.
 * Sends Cognito's built-in invite email (temp password, must reset on first login).
 * Creates DB profile + 'admin' role + tenant_members entry scoped to that tenant.
 *
 * Usage:
 *   TENANT_SLUG=acme \
 *   ADMIN_EMAIL=admin@acme.com \
 *   ADMIN_NAME='Acme Admin' \
 *   npx tsx src/scripts/invite-tenant-admin.ts
 *
 * The user will receive an email from Cognito with a temporary password.
 * Email domain is NOT enforced here — enforce it in the signup UI / pre-signup
 * Cognito Lambda trigger if you need strict per-tenant domain matching.
 */
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';

const TENANT_SLUG = process.env.TENANT_SLUG;
const EMAIL = process.env.ADMIN_EMAIL;
const NAME = process.env.ADMIN_NAME || 'Tenant Admin';

if (!TENANT_SLUG || !EMAIL) {
  console.error('❌ TENANT_SLUG and ADMIN_EMAIL env vars are required.');
  process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({ region: config.cognito.region });

async function main() {
  const tenant = await db('tenants').where('slug', TENANT_SLUG).first();
  if (!tenant) throw new Error(`Tenant with slug "${TENANT_SLUG}" not found`);

  console.log(`\n📨 Inviting ${EMAIL} as admin of "${tenant.name}"\n`);

  // Optional domain enforcement (warn only)
  if (tenant.domain && !EMAIL!.toLowerCase().endsWith('@' + tenant.domain.toLowerCase())) {
    console.warn(`⚠️  Email domain does not match tenant domain "${tenant.domain}". Continuing anyway.`);
  }

  let userSub: string;
  try {
    const created = await cognito.send(new AdminCreateUserCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: EMAIL!,
      UserAttributes: [
        { Name: 'email', Value: EMAIL! },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: NAME },
        { Name: 'custom:tenant_id', Value: tenant.id },
      ],
      DesiredDeliveryMediums: ['EMAIL'], // sends invite email with temp password
    }));
    userSub = created.User?.Attributes?.find(a => a.Name === 'sub')?.Value!;
    console.log('  ✓ Cognito user created, invite email sent');
  } catch (e: any) {
    if (!(e instanceof UsernameExistsException)) throw e;
    const existing = await cognito.send(new AdminGetUserCommand({
      UserPoolId: config.cognito.userPoolId, Username: EMAIL!,
    }));
    userSub = existing.UserAttributes?.find(a => a.Name === 'sub')?.Value!;
    console.log('  ✓ User already exists, reusing');
  }

  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: config.cognito.userPoolId,
    Username: EMAIL!,
    GroupName: 'admin',
  }));
  console.log('  ✓ Added to "admin" Cognito group');

  await db('profiles')
    .insert({ user_id: userSub, email: EMAIL, full_name: NAME, tenant_id: tenant.id })
    .onConflict('user_id').merge({ email: EMAIL, full_name: NAME, tenant_id: tenant.id });

  await db('user_roles')
    .insert({ user_id: userSub, role: 'admin' })
    .onConflict(['user_id', 'role']).ignore();

  await db('tenant_members')
    .insert({ tenant_id: tenant.id, user_id: userSub, role: 'admin', status: 'active' })
    .onConflict(['tenant_id', 'user_id']).merge({ role: 'admin', status: 'active' });

  // Auto-allowlist the admin's email domain so their colleagues can self-signup
  const emailDomain = EMAIL!.split('@')[1].toLowerCase();
  await db('authorized_domains')
    .insert({
      tenant_id: tenant.id,
      domain: emailDomain,
      default_role: 'user',
      enabled: true,
      notes: `Auto-added when inviting first admin (${EMAIL})`,
      created_by: userSub,
    })
    .onConflict(['tenant_id', 'domain']).ignore();
  console.log(`  ✓ Allowlisted "${emailDomain}" for tenant "${tenant.slug}"`);

  console.log(`\n✅ ${EMAIL} is now admin of "${tenant.name}"`);
  console.log(`   They will receive an email from Cognito with a temporary password.\n`);
  await db.destroy();
}

main().catch(async (err) => {
  console.error('❌ Failed:', err);
  await db.destroy();
  process.exit(1);
});
