import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ===== Account Groups & Ledger =====
  await knex.schema.createTable('account_groups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('nature').notNullable();
    t.text('description');
    t.boolean('is_primary').defaultTo(false);
    t.boolean('affects_gross_profit').defaultTo(false);
    t.integer('display_order').defaultTo(0);
    t.uuid('parent_group_id').references('id').inTable('account_groups');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ledger_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('code');
    t.uuid('group_id').references('id').inTable('account_groups');
    t.decimal('opening_balance', 18, 2).defaultTo(0);
    t.decimal('current_balance', 18, 2).defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.string('account_type');
    t.text('description');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Voucher System =====
  await knex.schema.createTable('voucher_types', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('abbreviation');
    t.string('prefix');
    t.string('numbering_method').defaultTo('automatic');
    t.integer('current_number').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('vouchers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('voucher_number');
    t.date('voucher_date').notNullable();
    t.uuid('voucher_type_id').references('id').inTable('voucher_types');
    t.uuid('party_ledger_id').references('id').inTable('ledger_accounts');
    t.text('narration');
    t.decimal('amount', 18, 2).defaultTo(0);
    t.string('status').defaultTo('draft');
    t.uuid('created_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('voucher_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('voucher_id').references('id').inTable('vouchers').onDelete('CASCADE');
    t.uuid('ledger_id').references('id').inTable('ledger_accounts');
    t.decimal('debit_amount', 18, 2).defaultTo(0);
    t.decimal('credit_amount', 18, 2).defaultTo(0);
    t.text('narration');
    t.timestamps(true, true);
  });

  // ===== Assets =====
  await knex.schema.createTable('asset_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.decimal('depreciation_rate', 5, 2);
    t.integer('useful_life_years');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('asset_number').notNullable();
    t.string('name').notNullable();
    t.text('description');
    t.string('status').defaultTo('available');
    t.uuid('category_id').references('id').inTable('asset_categories');
    t.string('serial_number');
    t.string('manufacturer');
    t.string('model');
    t.string('location');
    t.date('purchase_date');
    t.decimal('purchase_price', 18, 2);
    t.decimal('current_value', 18, 2);
    t.date('warranty_expiry');
    t.uuid('assigned_to');
    t.timestamp('assigned_at');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.uuid('updated_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('asset_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    t.uuid('assigned_to').notNullable();
    t.uuid('assigned_by').notNullable();
    t.timestamp('assigned_at').defaultTo(knex.fn.now());
    t.timestamp('returned_at');
    t.string('return_condition');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('asset_maintenance', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    t.string('maintenance_type').notNullable();
    t.text('description').notNullable();
    t.string('status').defaultTo('scheduled');
    t.date('scheduled_date');
    t.date('completed_date');
    t.decimal('cost', 18, 2);
    t.string('vendor');
    t.string('performed_by');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Attendance =====
  await knex.schema.createTable('attendance', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.timestamp('check_in').defaultTo(knex.fn.now());
    t.timestamp('check_out');
    t.decimal('work_hours', 5, 2);
    t.string('mood_check_in');
    t.string('mood_check_out');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('activity_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('activity_category');
    t.string('subcategory');
    t.string('department');
    t.string('team_type');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('attendance_activities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('attendance_id').references('id').inTable('attendance').onDelete('CASCADE');
    t.uuid('activity_id').references('id').inTable('activity_definitions');
    t.uuid('user_id').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.integer('duration_minutes').defaultTo(0);
    t.timestamp('started_at');
    t.timestamp('ended_at');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Calendar Events =====
  await knex.schema.createTable('calendar_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('description');
    t.string('event_type').defaultTo('meeting');
    t.timestamp('start_time').notNullable();
    t.timestamp('end_time');
    t.boolean('all_day').defaultTo(false);
    t.string('location');
    t.string('meeting_link');
    t.string('status').defaultTo('scheduled');
    t.boolean('is_public').defaultTo(false);
    t.integer('reminder_minutes');
    t.specificType('attendees', 'text[]');
    t.string('team_type');
    t.uuid('owner_id').notNullable();
    t.uuid('related_contact_id').references('id').inTable('contacts');
    t.uuid('related_deal_id').references('id').inTable('deals');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Chat =====
  await knex.schema.createTable('chat_conversations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name');
    t.string('type').defaultTo('direct');
    t.uuid('created_by').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('chat_participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('conversation_id').references('id').inTable('chat_conversations').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.timestamp('last_read_at');
  });

  await knex.schema.createTable('chat_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('conversation_id').references('id').inTable('chat_conversations').onDelete('CASCADE');
    t.uuid('sender_id').notNullable();
    t.text('content').notNullable();
    t.string('message_type').defaultTo('text');
    t.string('file_url');
    t.string('file_name');
    t.timestamp('expires_at').defaultTo(knex.raw("now() + interval '30 days'"));
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Compliance =====
  await knex.schema.createTable('compliance_frameworks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.specificType('type', 'framework_type').notNullable();
    t.string('version');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('compliance_controls', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('framework_id').references('id').inTable('compliance_frameworks').onDelete('CASCADE');
    t.string('control_id').notNullable();
    t.string('title').notNullable();
    t.text('description');
    t.string('category');
    t.specificType('status', 'compliance_status').defaultTo('not_started');
    t.uuid('assigned_to');
    t.date('due_date');
    t.timestamp('last_assessed_at');
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('compliance_evidence', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('control_id').references('id').inTable('compliance_controls').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.string('file_url');
    t.string('file_name');
    t.uuid('uploaded_by').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('compliance_assessments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('framework_id').references('id').inTable('compliance_frameworks').onDelete('CASCADE');
    t.uuid('assessor_id').notNullable();
    t.date('assessment_date').defaultTo(knex.fn.now());
    t.specificType('overall_status', 'compliance_status').defaultTo('not_started');
    t.integer('compliant_count');
    t.integer('non_compliant_count');
    t.integer('in_progress_count');
    t.text('findings');
    t.text('recommendations');
    t.timestamps(true, true);
  });

  // ===== Contractors =====
  await knex.schema.createTable('contractors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.string('company');
    t.string('designation');
    t.string('department');
    t.string('location');
    t.string('status').defaultTo('active');
    t.decimal('rate', 18, 2);
    t.string('rate_type');
    t.date('contract_start_date');
    t.date('contract_end_date');
    t.uuid('manager_id');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Cost Centers =====
  await knex.schema.createTable('cost_centers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('category');
    t.boolean('is_active').defaultTo(true);
    t.uuid('parent_center_id').references('id').inTable('cost_centers');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Currencies =====
  await knex.schema.createTable('currencies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('code').notNullable();
    t.string('name').notNullable();
    t.string('symbol').notNullable();
    t.integer('decimal_places').defaultTo(2);
    t.decimal('exchange_rate', 18, 6).defaultTo(1);
    t.boolean('is_base_currency').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.timestamp('last_updated');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Budgets =====
  await knex.schema.createTable('budgets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('fiscal_year').notNullable();
    t.string('budget_type');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.decimal('total_budget', 18, 2);
    t.string('status').defaultTo('draft');
    t.text('notes');
    t.uuid('created_by');
    t.uuid('approved_by');
    t.timestamp('approved_at');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('budget_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('budget_id').references('id').inTable('budgets').onDelete('CASCADE');
    t.uuid('ledger_id').references('id').inTable('ledger_accounts');
    t.uuid('cost_center_id').references('id').inTable('cost_centers');
    t.decimal('budgeted_amount', 18, 2).defaultTo(0);
    t.decimal('actual_amount', 18, 2);
    t.decimal('variance_amount', 18, 2);
    t.integer('period_month');
    t.text('notes');
    t.timestamps(true, true);
  });

  // ===== Bank Reconciliation =====
  await knex.schema.createTable('bank_reconciliation', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('ledger_id').references('id').inTable('ledger_accounts');
    t.uuid('voucher_id').references('id').inTable('vouchers');
    t.date('transaction_date').notNullable();
    t.date('bank_date');
    t.decimal('amount', 18, 2).notNullable();
    t.string('transaction_type');
    t.string('cheque_number');
    t.boolean('is_reconciled').defaultTo(false);
    t.timestamp('reconciled_at');
    t.uuid('reconciled_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Day Book =====
  await knex.schema.createTable('day_book_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.date('entry_date').notNullable();
    t.uuid('voucher_id').references('id').inTable('vouchers');
    t.string('voucher_type');
    t.string('voucher_number');
    t.string('party_name');
    t.decimal('debit_amount', 18, 2).defaultTo(0);
    t.decimal('credit_amount', 18, 2).defaultTo(0);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Contact Lifecycle Stages =====
  await knex.schema.createTable('contact_lifecycle_stages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('color');
    t.integer('display_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Canned Responses =====
  await knex.schema.createTable('canned_responses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('content').notNullable();
    t.string('category');
    t.string('shortcut');
    t.boolean('is_active').defaultTo(true);
    t.integer('usage_count').defaultTo(0);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Approval Workflows =====
  await knex.schema.createTable('approval_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('entity_type').notNullable();
    t.uuid('entity_id').notNullable();
    t.string('status').defaultTo('pending');
    t.string('required_role').defaultTo('manager');
    t.integer('approval_level').defaultTo(1);
    t.uuid('approver_id');
    t.timestamp('approved_at');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'approval_workflows', 'canned_responses', 'contact_lifecycle_stages',
    'day_book_entries', 'bank_reconciliation', 'budget_items', 'budgets',
    'currencies', 'cost_centers', 'contractors',
    'compliance_assessments', 'compliance_evidence', 'compliance_controls', 'compliance_frameworks',
    'chat_messages', 'chat_participants', 'chat_conversations',
    'calendar_events', 'attendance_activities', 'activity_definitions', 'attendance',
    'asset_maintenance', 'asset_assignments', 'assets', 'asset_categories',
    'voucher_entries', 'vouchers', 'voucher_types', 'ledger_accounts', 'account_groups',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
