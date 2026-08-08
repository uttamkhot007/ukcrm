import type { Knex } from 'knex';

/**
 * Microservice control plane.
 *
 *  - `tenant_clusters`  : per-tenant data placement, enabling dedicated
 *                          databases/regions for enterprise tenants.
 *  - `outbox_events`    : transactional outbox so events are never published
 *                          for rolled-back writes and never lost after commit.
 *  - `service_registry` : self-reported service health/version for the
 *                          platform console and deploy gates.
 *  - `saga_instances`   : long-running cross-service workflow state with
 *                          compensation tracking.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tenant_clusters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().unique();
    t.string('host').notNullable();
    t.integer('port').notNullable().defaultTo(5432);
    t.string('database_name').notNullable();
    t.string('schema_name').defaultTo('public');
    t.string('db_user');
    t.string('db_password');
    t.string('region');
    t.string('tier').notNullable().defaultTo('dedicated');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('outbox_events', (t) => {
    t.uuid('id').primary();
    t.string('event_type').notNullable();
    t.string('source_service').notNullable();
    t.uuid('tenant_id').nullable();
    t.string('subject').nullable();
    t.string('trace_id').nullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('published_at').nullable();
    t.integer('attempts').notNullable().defaultTo(0);
    t.text('last_error').nullable();
    t.index(['published_at', 'occurred_at'], 'outbox_unpublished_idx');
    t.index(['tenant_id']);
    t.index(['event_type']);
  });

  await knex.schema.createTable('service_registry', (t) => {
    t.string('service_name').primary();
    t.string('domain').notNullable();
    t.string('version').notNullable().defaultTo('dev');
    t.string('status').notNullable().defaultTo('unknown');
    t.integer('instances').notNullable().defaultTo(0);
    t.jsonb('slo').notNullable().defaultTo('{}');
    t.timestamp('last_heartbeat_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('saga_instances', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable();
    t.string('saga_type').notNullable();
    t.string('correlation_id').notNullable();
    t.string('status').notNullable().defaultTo('running');
    t.string('current_step').nullable();
    t.jsonb('state').notNullable().defaultTo('{}');
    t.jsonb('completed_steps').notNullable().defaultTo('[]');
    t.text('last_error').nullable();
    t.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.index(['tenant_id', 'saga_type']);
    t.unique(['saga_type', 'correlation_id']);
  });

  // Session-scoped tenant pinning used by withTenantSession().
  await knex.raw(`
    CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS current_tenant_id()');
  await knex.schema.dropTableIfExists('saga_instances');
  await knex.schema.dropTableIfExists('service_registry');
  await knex.schema.dropTableIfExists('outbox_events');
  await knex.schema.dropTableIfExists('tenant_clusters');
}
