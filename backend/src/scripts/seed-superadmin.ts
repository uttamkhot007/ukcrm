/**
 * Seed Super Admin User
 * ----------------------
 * Creates a Cognito user (auto-confirmed, permanent password) and a matching
 * profile + super_admin role + 'admin' role across all existing tenants.
 *
 * Usage (from backend/):
 *   AWS_REGION=ap-south-1 \
 *   COGNITO_USER_POOL_ID=ap-south-1_XXXX \
 *   COGNITO_CLIENT_ID=xxxx \
 *   DB_HOST=... DB_NAME=... DB_USER=... DB_PASSWORD=... \
 *   SUPERADMIN_EMAIL=admin@yourco.com \
 *   SUPERADMIN_PASSWORD='StrongPass#2026!' \
 *   SUPERADMIN_NAME='Platform Super Admin' \
 *   npx tsx src/scripts/seed-superadmin.ts
 *
 * Idempotent: safe to re-run. Will reset the password if user already exists.
 */
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
  AdminGetUserCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';

const EMAIL = process.env.SUPERADMIN_EMAIL;
const PASSWORD = process.env.SUPERADMIN_PASSWORD;
const NAME = process.env.SUPERADMIN_NAME || 'Super Admin';

if (!EMAIL || !PASSWORD) {
  console.error('❌ SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD env vars are required.');
  process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({ region: config.cognito.region });

async function ensureGroup(name: string, description: string) {
  try {
    await cognito.send(new CreateGroupCommand({
      UserPoolId: config.cognito.userPoolId,
      GroupName: name,
      Description: description,
    }));
    console.log(`  ✓ Created Cognito group "${name}"`);
  } catch (e: any) {
    if (e.name !== 'GroupExistsException') throw e;
    console.log(`  ✓ Cognito group "${name}" already exists`);
  }
}

async function getOrCreateCognitoUser(): Promise<string> {
  try {
    const created = await cognito.send(new AdminCreateUserCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: EMAIL!,
      UserAttributes: [
        { Name: 'email', Value: EMAIL! },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: NAME },
      ],
      MessageAction: 'SUPPRESS', // do not send invite email
    }));
    console.log(`  ✓ Created Cognito user`);
    return created.User?.Attributes?.find(a => a.Name === 'sub')?.Value!;
  } catch (e: any) {
    if (!(e instanceof UsernameExistsException)) throw e;
    const existing = await cognito.send(new AdminGetUserCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: EMAIL!,
    }));
    console.log(`  ✓ Cognito user already exists`);
    return existing.UserAttributes?.find(a => a.Name === 'sub')?.Value!;
  }
}

async function main() {
  console.log(`\n🚀 Seeding superadmin: ${EMAIL}\n`);
  console.log('Step 1: Cognito groups');
  await ensureGroup('super_admin', 'Platform-wide super administrators');
  await ensureGroup('admin', 'Tenant administrators');

  console.log('\nStep 2: Cognito user');
  const userSub = await getOrCreateCognitoUser();

  console.log('\nStep 3: Set permanent password');
  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: config.cognito.userPoolId,
    Username: EMAIL!,
    Password: PASSWORD!,
    Permanent: true,
  }));
  console.log('  ✓ Password set (permanent)');

  console.log('\nStep 4: Add to super_admin group');
  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: config.cognito.userPoolId,
    Username: EMAIL!,
    GroupName: 'super_admin',
  }));
  console.log('  ✓ Added to super_admin group');

  console.log('\nStep 5: DB profile + roles');
  await db('profiles')
    .insert({
      user_id: userSub,
      email: EMAIL,
      full_name: NAME,
      is_super_admin: true,
      employment_status: 'active',
      user_category: 'employee',
    })
    .onConflict('user_id')
    .merge({ email: EMAIL, full_name: NAME, is_super_admin: true });
  console.log('  ✓ Profile upserted');

  await db('user_roles')
    .insert({ user_id: userSub, role: 'super_admin' })
    .onConflict(['user_id', 'role']).ignore();
  await db('user_roles')
    .insert({ user_id: userSub, role: 'admin' })
    .onConflict(['user_id', 'role']).ignore();
  console.log('  ✓ Roles assigned (super_admin, admin)');

  console.log('\nStep 6: Cross-tenant membership');
  const tenants = await db('tenants').select('id', 'name');
  for (const t of tenants) {
    await db('tenant_members')
      .insert({ tenant_id: t.id, user_id: userSub, role: 'super_admin', status: 'active' })
      .onConflict(['tenant_id', 'user_id']).merge({ role: 'super_admin', status: 'active' });
  }
  console.log(`  ✓ Granted access to ${tenants.length} tenant(s)`);

  console.log('\n✅ Done!\n');
  console.log('───────────────────────────────────────');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: (the SUPERADMIN_PASSWORD you set)`);
  console.log(`  Cognito sub: ${userSub}`);
  console.log('───────────────────────────────────────\n');
  console.log('Login at: https://<your-alb-or-domain>/auth\n');
  await db.destroy();
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await db.destroy();
  process.exit(1);
});
