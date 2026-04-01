import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ===== Tenants (foundation) =====
  await knex.schema.createTable('tenants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('slug').unique();
    t.string('domain');
    t.string('logo_url');
    t.specificType('status', 'tenant_status').defaultTo('active');
    t.specificType('tier', 'tenant_tier').defaultTo('starter');
    t.specificType('data_region', 'data_region').defaultTo('ap-south');
    t.jsonb('settings').defaultTo('{}');
    t.string('created_by');
    t.timestamps(true, true);
  });

  // ===== Profiles =====
  await knex.schema.createTable('profiles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().unique();
    t.string('email');
    t.string('full_name');
    t.string('avatar_url');
    t.string('phone');
    t.string('designation');
    t.string('department');
    t.string('location');
    t.date('birth_date');
    t.date('hire_date');
    t.specificType('employment_status', 'employment_status').defaultTo('active');
    t.specificType('user_category', 'user_category').defaultTo('employee');
    t.uuid('manager_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.boolean('is_super_admin').defaultTo(false);
    t.jsonb('preferences').defaultTo('{}');
    t.timestamps(true, true);
  });

  // ===== User Roles =====
  await knex.schema.createTable('user_roles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.specificType('role', 'app_role').notNullable();
    t.unique(['user_id', 'role']);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== User Teams =====
  await knex.schema.createTable('user_teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.specificType('team', 'team_type').notNullable();
    t.specificType('sub_team', 'sales_sub_team');
    t.unique(['user_id', 'team']);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Tenant Members =====
  await knex.schema.createTable('tenant_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('user_id').notNullable();
    t.string('role').defaultTo('member');
    t.string('status').defaultTo('active');
    t.unique(['tenant_id', 'user_id']);
    t.timestamps(true, true);
  });

  // ===== Tenant Modules =====
  await knex.schema.createTable('module_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('key').unique().notNullable();
    t.string('name').notNullable();
    t.text('description');
    t.string('icon');
    t.string('category');
    t.boolean('is_premium').defaultTo(false);
    t.integer('display_order').defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tenant_modules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.string('module_key').notNullable();
    t.boolean('is_enabled').defaultTo(true);
    t.unique(['tenant_id', 'module_key']);
    t.timestamps(true, true);
  });

  // ===== Contacts =====
  await knex.schema.createTable('contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.string('company');
    t.string('designation');
    t.string('department');
    t.text('notes');
    t.string('avatar_url');
    t.string('linkedin_url');
    t.string('source_type');
    t.string('seniority_level');
    t.string('role_in_deal');
    t.boolean('is_champion').defaultTo(false);
    t.integer('engagement_score').defaultTo(0);
    t.timestamp('last_contacted_at');
    t.uuid('lifecycle_stage_id');
    t.timestamp('lifecycle_updated_at');
    t.uuid('alliance_organization_id');
    t.uuid('alliance_user_id');
    t.uuid('reporting_manager_id');
    t.uuid('user_id').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.uuid('updated_by');
    t.timestamps(true, true);
  });

  // ===== Deals =====
  await knex.schema.createTable('deals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.decimal('value', 18, 2).defaultTo(0);
    t.string('stage').defaultTo('pipeline');
    t.specificType('closed_won_substage', 'closed_won_substage');
    t.string('priority');
    t.text('description');
    t.date('expected_close_date');
    t.date('actual_close_date');
    t.string('loss_reason');
    t.integer('probability');
    t.uuid('contact_id');
    t.uuid('assigned_to');
    t.uuid('user_id').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.string('currency').defaultTo('INR');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);
  });

  // ===== Alliance Organizations =====
  await knex.schema.createTable('alliance_organizations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('industry');
    t.string('website');
    t.text('address');
    t.string('logo_url');
    t.string('status').defaultTo('active');
    t.string('organization_type');
    t.specificType('services', 'text[]');
    t.specificType('solutions', 'text[]');
    t.specificType('security_controls', 'text[]');
    t.jsonb('customer_environment');
    t.jsonb('infrastructure_config');
    t.jsonb('solution_configs');
    t.jsonb('team_config');
    t.uuid('account_manager_id');
    t.uuid('technical_account_manager_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.uuid('updated_by');
    t.timestamps(true, true);
  });

  // ===== Alliance Users =====
  await knex.schema.createTable('alliance_users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.string('designation');
    t.string('role');
    t.string('location');
    t.string('linkedin_url');
    t.string('profile_image_url');
    t.string('status').defaultTo('active');
    t.text('notes');
    t.date('dob');
    t.date('anniversary_date');
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('SET NULL');
    t.uuid('escalation_manager_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.uuid('updated_by');
    t.timestamps(true, true);
  });

  // ===== Tickets =====
  await knex.schema.createTable('tickets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('ticket_number').unique();
    t.string('title').notNullable();
    t.text('description');
    t.specificType('status', 'ticket_status').defaultTo('open');
    t.specificType('priority', 'ticket_priority').defaultTo('medium');
    t.specificType('category', 'ticket_category').defaultTo('service_request');
    t.uuid('contact_id');
    t.uuid('assigned_to');
    t.uuid('user_id').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.integer('sla_hours');
    t.timestamp('sla_deadline');
    t.timestamp('resolved_at');
    t.timestamps(true, true);
  });

  // ===== Notifications =====
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('title').notNullable();
    t.text('message');
    t.string('type').defaultTo('info');
    t.string('category');
    t.string('reference_type');
    t.uuid('reference_id');
    t.string('action_url');
    t.boolean('is_read').defaultTo(false);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Notification Preferences =====
  await knex.schema.createTable('notification_preferences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().unique();
    t.boolean('email_notifications').defaultTo(true);
    t.boolean('push_notifications').defaultTo(true);
    t.boolean('deal_updates').defaultTo(true);
    t.boolean('ticket_updates').defaultTo(true);
    t.boolean('mention_notifications').defaultTo(true);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'notification_preferences', 'notifications', 'tickets',
    'alliance_users', 'alliance_organizations', 'deals', 'contacts',
    'tenant_modules', 'module_definitions', 'tenant_members',
    'user_teams', 'user_roles', 'profiles', 'tenants',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
