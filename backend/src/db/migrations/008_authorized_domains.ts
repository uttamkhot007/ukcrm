import { Knex } from 'knex';

/**
 * Strict allowlist for self-signup.
 *
 * - Users can ONLY register if their email domain matches a row here.
 * - `tenant_id IS NULL` means "platform-wide allowlist" — domain can sign up
 *   into the matching tenant (resolved by domain → tenant lookup).
 * - `default_role` decides what role a new signup gets (user / admin).
 *
 * Managed by super admins (cross-tenant) and tenant admins (own tenant only).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('authorized_domains', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.string('domain').notNullable(); // lowercase, no @, e.g. "acme.com"
    t.string('default_role').notNullable().defaultTo('user'); // user | admin
    t.boolean('enabled').notNullable().defaultTo(true);
    t.text('notes');
    t.uuid('created_by');
    t.timestamps(true, true);
    t.unique(['tenant_id', 'domain']);
    t.index('domain');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('authorized_domains');
}
