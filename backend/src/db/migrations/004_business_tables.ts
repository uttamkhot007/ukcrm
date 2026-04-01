import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ===== Deal Activities =====
  await knex.schema.createTable('deal_activities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals').onDelete('CASCADE');
    t.uuid('user_id');
    t.string('activity_type').notNullable();
    t.text('description');
    t.jsonb('metadata');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('deal_products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals').onDelete('CASCADE');
    t.string('product_name').notNullable();
    t.integer('quantity').defaultTo(1);
    t.decimal('unit_price', 18, 2).defaultTo(0);
    t.decimal('total_price', 18, 2).defaultTo(0);
    t.decimal('discount', 5, 2).defaultTo(0);
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('deal_stage_progression_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals').onDelete('CASCADE');
    t.string('from_stage');
    t.string('to_stage').notNullable();
    t.uuid('changed_by');
    t.text('notes');
    t.integer('days_in_stage');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Deal Registrations =====
  await knex.schema.createTable('deal_registrations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals');
    t.string('registration_number');
    t.string('vendor_name');
    t.string('status').defaultTo('submitted');
    t.date('submitted_date');
    t.date('expiry_date');
    t.text('notes');
    t.uuid('submitted_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('deal_registration_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('registration_id').references('id').inTable('deal_registrations').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.text('content').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('deal_registration_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('registration_id').references('id').inTable('deal_registrations').onDelete('CASCADE');
    t.string('action').notNullable();
    t.string('old_value');
    t.string('new_value');
    t.uuid('changed_by');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Quotations =====
  await knex.schema.createTable('quotations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('quotation_number').unique();
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.specificType('status', 'quotation_status').defaultTo('draft');
    t.decimal('total_amount', 18, 2).defaultTo(0);
    t.decimal('discount_amount', 18, 2).defaultTo(0);
    t.decimal('tax_amount', 18, 2).defaultTo(0);
    t.date('valid_until');
    t.text('terms_and_conditions');
    t.text('notes');
    t.uuid('created_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('quotation_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('quotation_id').references('id').inTable('quotations').onDelete('CASCADE');
    t.string('product_name').notNullable();
    t.text('description');
    t.integer('quantity').defaultTo(1);
    t.decimal('unit_price', 18, 2).defaultTo(0);
    t.decimal('discount', 5, 2).defaultTo(0);
    t.decimal('tax_rate', 5, 2).defaultTo(0);
    t.decimal('total', 18, 2).defaultTo(0);
    t.timestamps(true, true);
  });

  // ===== Invoices =====
  await knex.schema.createTable('invoices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('invoice_number').unique();
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.uuid('quotation_id').references('id').inTable('quotations');
    t.specificType('status', 'invoice_status').defaultTo('draft');
    t.decimal('subtotal', 18, 2).defaultTo(0);
    t.decimal('tax_amount', 18, 2).defaultTo(0);
    t.decimal('discount_amount', 18, 2).defaultTo(0);
    t.decimal('total_amount', 18, 2).defaultTo(0);
    t.decimal('paid_amount', 18, 2).defaultTo(0);
    t.date('issue_date');
    t.date('due_date');
    t.date('paid_date');
    t.text('notes');
    t.text('terms');
    t.uuid('created_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('invoice_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('invoice_id').references('id').inTable('invoices').onDelete('CASCADE');
    t.string('description').notNullable();
    t.integer('quantity').defaultTo(1);
    t.decimal('unit_price', 18, 2).defaultTo(0);
    t.decimal('tax_rate', 5, 2).defaultTo(0);
    t.decimal('discount', 5, 2).defaultTo(0);
    t.decimal('total', 18, 2).defaultTo(0);
    t.timestamps(true, true);
  });

  // ===== Estimates =====
  await knex.schema.createTable('estimates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('estimate_number').unique();
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.string('status').defaultTo('draft');
    t.decimal('total_amount', 18, 2).defaultTo(0);
    t.date('valid_until');
    t.text('notes');
    t.uuid('created_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('estimate_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('estimate_id').references('id').inTable('estimates').onDelete('CASCADE');
    t.string('description').notNullable();
    t.integer('quantity').defaultTo(1);
    t.decimal('unit_price', 18, 2).defaultTo(0);
    t.decimal('total', 18, 2).defaultTo(0);
    t.timestamps(true, true);
  });

  // ===== Employee Management =====
  await knex.schema.createTable('employee_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('request_number').unique();
    t.specificType('type', 'request_type').notNullable();
    t.string('title').notNullable();
    t.text('description');
    t.specificType('status', 'request_status').defaultTo('pending');
    t.specificType('priority', 'request_priority').defaultTo('medium');
    t.integer('sla_hours');
    t.timestamp('sla_deadline');
    t.string('assigned_team');
    t.uuid('assigned_to');
    t.uuid('user_id').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('request_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('request_id').references('id').inTable('employee_requests').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.text('content').notNullable();
    t.boolean('is_internal').defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('request_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('request_id').references('id').inTable('employee_requests').onDelete('CASCADE');
    t.string('action').notNullable();
    t.string('old_value');
    t.string('new_value');
    t.uuid('changed_by');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Leave Management =====
  await knex.schema.createTable('leave_policies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('leave_type').notNullable();
    t.integer('days_allowed').notNullable();
    t.boolean('is_paid').defaultTo(true);
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('leave_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('request_number').unique();
    t.uuid('user_id').notNullable();
    t.uuid('policy_id').references('id').inTable('leave_policies');
    t.string('leave_type').notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.decimal('days_requested', 4, 1).notNullable();
    t.text('reason');
    t.string('status').defaultTo('pending');
    t.uuid('approved_by');
    t.timestamp('approved_at');
    t.text('rejection_reason');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('leave_balances', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.uuid('policy_id').references('id').inTable('leave_policies');
    t.string('leave_type').notNullable();
    t.decimal('total_days', 4, 1).defaultTo(0);
    t.decimal('used_days', 4, 1).defaultTo(0);
    t.decimal('remaining_days', 4, 1).defaultTo(0);
    t.string('fiscal_year');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Expenses =====
  await knex.schema.createTable('expense_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.decimal('budget_limit', 18, 2);
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('expense_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('report_number').unique();
    t.string('title').notNullable();
    t.string('status').defaultTo('draft');
    t.decimal('total_amount', 18, 2).defaultTo(0);
    t.uuid('user_id').notNullable();
    t.uuid('approved_by');
    t.timestamp('approved_at');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('expense_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('expense_report_id').references('id').inTable('expense_reports').onDelete('CASCADE');
    t.uuid('category_id').references('id').inTable('expense_categories');
    t.string('description').notNullable();
    t.decimal('amount', 18, 2).notNullable();
    t.date('expense_date');
    t.string('receipt_url');
    t.text('notes');
    t.timestamps(true, true);
  });

  // ===== Travel =====
  await knex.schema.createTable('travel_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('request_number').unique();
    t.uuid('user_id').notNullable();
    t.string('purpose').notNullable();
    t.string('destination').notNullable();
    t.date('departure_date').notNullable();
    t.date('return_date').notNullable();
    t.decimal('estimated_cost', 18, 2);
    t.decimal('actual_cost', 18, 2);
    t.string('status').defaultTo('pending');
    t.text('notes');
    t.uuid('approved_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('travel_bookings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('travel_request_id').references('id').inTable('travel_requests').onDelete('CASCADE');
    t.string('booking_type').notNullable();
    t.string('provider');
    t.string('booking_reference');
    t.decimal('cost', 18, 2);
    t.string('status').defaultTo('pending');
    t.jsonb('details').defaultTo('{}');
    t.timestamps(true, true);
  });

  // ===== Renewals =====
  await knex.schema.createTable('renewals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.specificType('type', 'renewal_type').defaultTo('contract');
    t.specificType('status', 'renewal_status').defaultTo('active');
    t.string('vendor');
    t.date('start_date');
    t.date('expiry_date');
    t.decimal('cost', 18, 2);
    t.uuid('assigned_to');
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.text('notes');
    t.uuid('created_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Sales Teams =====
  await knex.schema.createTable('sales_teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.uuid('leader_id');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sales_team_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('team_id').references('id').inTable('sales_teams').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.string('role').defaultTo('member');
    t.unique(['team_id', 'user_id']);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sales_targets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id');
    t.uuid('team_id').references('id').inTable('sales_teams');
    t.string('period').notNullable();
    t.decimal('target_amount', 18, 2).notNullable();
    t.decimal('achieved_amount', 18, 2).defaultTo(0);
    t.string('target_type').defaultTo('revenue');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sales_territories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('region');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('territory_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('territory_id').references('id').inTable('sales_territories').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.boolean('is_primary').defaultTo(false);
    t.timestamps(true, true);
  });

  // ===== Sales Forecasts =====
  await knex.schema.createTable('sales_forecasts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('period').notNullable();
    t.decimal('forecast_amount', 18, 2).defaultTo(0);
    t.decimal('weighted_amount', 18, 2).defaultTo(0);
    t.string('category');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Inside Sales =====
  await knex.schema.createTable('inside_sales_prospects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('company_name');
    t.string('contact_name');
    t.string('contact_email');
    t.string('contact_phone');
    t.string('original_deal_title');
    t.decimal('original_deal_value', 18, 2);
    t.string('loss_reason');
    t.string('status').defaultTo('new');
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.uuid('assigned_to');
    t.uuid('created_by');
    t.text('notes');
    t.date('follow_up_date');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Leads =====
  await knex.schema.createTable('leads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.string('company');
    t.string('source');
    t.specificType('status', 'lead_status').defaultTo('new');
    t.text('notes');
    t.uuid('assigned_to');
    t.uuid('converted_contact_id');
    t.uuid('converted_deal_id');
    t.uuid('user_id').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'leads', 'inside_sales_prospects', 'sales_forecasts',
    'territory_assignments', 'sales_territories', 'sales_targets',
    'sales_team_members', 'sales_teams', 'renewals',
    'travel_bookings', 'travel_requests',
    'expense_items', 'expense_reports', 'expense_categories',
    'leave_balances', 'leave_requests', 'leave_policies',
    'request_history', 'request_comments', 'employee_requests',
    'estimate_items', 'estimates', 'invoice_items', 'invoices',
    'quotation_items', 'quotations',
    'deal_registration_history', 'deal_registration_comments', 'deal_registrations',
    'deal_stage_progression_log', 'deal_products', 'deal_activities',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
