import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ===== Post Sale Workflows =====
  await knex.schema.createTable('post_sale_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals');
    t.specificType('workflow_type', 'post_sale_workflow_type').notNullable();
    t.specificType('status', 'post_sale_workflow_status').defaultTo('pending');
    t.uuid('assigned_to');
    t.text('notes');
    t.timestamp('started_at');
    t.timestamp('completed_at');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('post_sale_workflow_stages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('workflow_id').references('id').inTable('post_sale_workflows').onDelete('CASCADE');
    t.string('stage_name').notNullable();
    t.integer('stage_order').defaultTo(0);
    t.specificType('status', 'post_sale_workflow_status').defaultTo('pending');
    t.uuid('assigned_to');
    t.text('notes');
    t.timestamp('completed_at');
    t.timestamps(true, true);
  });

  // ===== Accounts Workflows =====
  await knex.schema.createTable('accounts_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('description');
    t.string('workflow_type').notNullable();
    t.string('status').defaultTo('pending');
    t.string('current_stage').notNullable();
    t.string('priority');
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('order_request_id');
    t.uuid('parent_workflow_id');
    t.uuid('initiated_by').notNullable();
    t.uuid('assigned_to');
    t.jsonb('metadata');
    t.timestamp('started_at');
    t.timestamp('completed_at');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('accounts_workflow_stage_completions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('workflow_id').references('id').inTable('accounts_workflows').onDelete('CASCADE');
    t.uuid('stage_id').notNullable();
    t.integer('stage_order').notNullable();
    t.boolean('is_current').defaultTo(false);
    t.uuid('completed_by');
    t.timestamp('completed_at');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Order Processing =====
  await knex.schema.createTable('order_processing_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('request_number');
    t.uuid('deal_id').references('id').inTable('deals');
    t.string('status').defaultTo('pending');
    t.string('priority').defaultTo('medium');
    t.jsonb('order_details');
    t.uuid('requested_by').notNullable();
    t.uuid('approved_by');
    t.timestamp('approved_at');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== HR Workflows =====
  await knex.schema.createTable('hr_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.specificType('workflow_type', 'hr_workflow_type').notNullable();
    t.specificType('status', 'hr_workflow_status').defaultTo('draft');
    t.string('title').notNullable();
    t.text('description');
    t.uuid('candidate_id');
    t.uuid('employee_id');
    t.uuid('assigned_to');
    t.string('current_stage');
    t.jsonb('metadata');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('hr_checklists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('checklist_type').notNullable();
    t.jsonb('items').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('employee_checklist_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('checklist_id').references('id').inTable('hr_checklists');
    t.uuid('user_id').notNullable();
    t.uuid('assigned_by');
    t.jsonb('completed_items').defaultTo('[]');
    t.string('status').defaultTo('pending');
    t.timestamps(true, true);
  });

  // ===== Job Postings & Applicants =====
  await knex.schema.createTable('job_postings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('description');
    t.string('department');
    t.string('location');
    t.string('employment_type').defaultTo('full_time');
    t.string('experience_level');
    t.string('status').defaultTo('open');
    t.integer('applications_count').defaultTo(0);
    t.uuid('hiring_manager_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('job_applicants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('applicant_number').unique();
    t.uuid('job_id').references('id').inTable('job_postings').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.string('resume_url');
    t.string('status').defaultTo('applied');
    t.string('current_stage');
    t.text('notes');
    t.uuid('assigned_to');
    t.jsonb('evaluation');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('interview_scorecards', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('applicant_id').references('id').inTable('job_applicants').onDelete('CASCADE');
    t.uuid('interviewer_id').notNullable();
    t.string('interview_type');
    t.integer('overall_score');
    t.jsonb('scores');
    t.text('strengths');
    t.text('weaknesses');
    t.text('recommendation');
    t.string('decision');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('offer_letters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('applicant_id').references('id').inTable('job_applicants');
    t.string('position').notNullable();
    t.decimal('salary', 18, 2);
    t.date('joining_date');
    t.string('status').defaultTo('draft');
    t.text('terms');
    t.uuid('prepared_by');
    t.uuid('approved_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Inventory =====
  await knex.schema.createTable('inventory_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('sku');
    t.string('category');
    t.integer('quantity_on_hand').defaultTo(0);
    t.integer('reorder_level');
    t.decimal('unit_cost', 18, 2).defaultTo(0);
    t.string('unit');
    t.string('location');
    t.uuid('vendor_id').references('id').inTable('vendors');
    t.timestamp('last_restocked_at');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('inventory_transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('item_id').references('id').inTable('inventory_items').onDelete('CASCADE');
    t.string('transaction_type').notNullable();
    t.integer('quantity').notNullable();
    t.text('notes');
    t.string('reference_number');
    t.uuid('performed_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Stock Management =====
  await knex.schema.createTable('stock_groups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.uuid('parent_group_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('units_of_measure', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('symbol');
    t.integer('decimal_places').defaultTo(2);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('godowns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('address');
    t.uuid('parent_godown_id');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('stock_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.uuid('group_id').references('id').inTable('stock_groups');
    t.uuid('unit_id').references('id').inTable('units_of_measure');
    t.uuid('godown_id').references('id').inTable('godowns');
    t.decimal('opening_quantity', 18, 3).defaultTo(0);
    t.decimal('opening_value', 18, 2).defaultTo(0);
    t.decimal('current_quantity', 18, 3).defaultTo(0);
    t.decimal('current_value', 18, 2).defaultTo(0);
    t.string('hsn_code');
    t.decimal('gst_rate', 5, 2);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('stock_ledger', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('stock_item_id').references('id').inTable('stock_items');
    t.uuid('voucher_id').references('id').inTable('vouchers');
    t.date('transaction_date').notNullable();
    t.decimal('quantity_in', 18, 3).defaultTo(0);
    t.decimal('quantity_out', 18, 3).defaultTo(0);
    t.decimal('rate', 18, 2);
    t.decimal('value', 18, 2);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== GST =====
  await knex.schema.createTable('hsn_sac_master', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('code').notNullable();
    t.string('type').notNullable();
    t.text('description');
    t.decimal('gst_rate', 5, 2);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('gst_transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('voucher_id').references('id').inTable('vouchers');
    t.string('gstin');
    t.string('transaction_type');
    t.decimal('taxable_amount', 18, 2);
    t.decimal('cgst', 18, 2).defaultTo(0);
    t.decimal('sgst', 18, 2).defaultTo(0);
    t.decimal('igst', 18, 2).defaultTo(0);
    t.decimal('cess', 18, 2).defaultTo(0);
    t.string('hsn_code');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('gst_returns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('return_type').notNullable();
    t.string('period').notNullable();
    t.string('status').defaultTo('draft');
    t.date('due_date');
    t.date('filed_date');
    t.decimal('tax_liability', 18, 2);
    t.decimal('itc_claimed', 18, 2);
    t.decimal('net_tax', 18, 2);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('e_invoices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('invoice_id').references('id').inTable('invoices');
    t.string('irn');
    t.text('signed_qr_code');
    t.string('ack_number');
    t.timestamp('ack_date');
    t.string('status').defaultTo('pending');
    t.jsonb('irp_response');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('eway_bills', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('invoice_id').references('id').inTable('invoices');
    t.string('eway_bill_number');
    t.date('generation_date');
    t.date('valid_until');
    t.string('status').defaultTo('active');
    t.jsonb('transport_details');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== TDS/TCS =====
  await knex.schema.createTable('tds_tcs_rates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('section').notNullable();
    t.string('description');
    t.string('type').notNullable();
    t.decimal('rate', 5, 2).notNullable();
    t.decimal('threshold', 18, 2);
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tds_tcs_transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('voucher_id').references('id').inTable('vouchers');
    t.uuid('rate_id').references('id').inTable('tds_tcs_rates');
    t.string('pan_number');
    t.decimal('base_amount', 18, 2);
    t.decimal('tax_amount', 18, 2);
    t.date('deduction_date');
    t.string('status').defaultTo('pending');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Fiscal Years =====
  await knex.schema.createTable('fiscal_years', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.boolean('is_current').defaultTo(false);
    t.boolean('is_closed').defaultTo(false);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Exchange Rate History =====
  await knex.schema.createTable('exchange_rate_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('currency_id').references('id').inTable('currencies');
    t.decimal('rate', 18, 6).notNullable();
    t.date('effective_date').notNullable();
    t.string('source');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Notifications & Push =====
  await knex.schema.createTable('push_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('endpoint').notNullable();
    t.jsonb('keys').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Team Chat =====
  await knex.schema.createTable('team_chat_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('sender_id').notNullable();
    t.string('team_type').notNullable();
    t.text('content').notNullable();
    t.string('message_type').defaultTo('text');
    t.string('file_url');
    t.string('file_name');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('team_reminders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('title').notNullable();
    t.text('description');
    t.timestamp('remind_at').notNullable();
    t.boolean('is_completed').defaultTo(false);
    t.string('entity_type');
    t.uuid('entity_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Document Templates =====
  await knex.schema.createTable('document_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('template_type').notNullable();
    t.text('content');
    t.jsonb('variables').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  // ===== Legal Documents =====
  await knex.schema.createTable('legal_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.specificType('document_type', 'legal_document_type').notNullable();
    t.specificType('status', 'legal_document_status').defaultTo('draft');
    t.text('content');
    t.string('file_url');
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.date('expiry_date');
    t.uuid('created_by').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('legal_document_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('document_id').references('id').inTable('legal_documents').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.text('content').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('legal_document_approvals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('document_id').references('id').inTable('legal_documents').onDelete('CASCADE');
    t.uuid('approver_id').notNullable();
    t.string('status').defaultTo('pending');
    t.text('comments');
    t.timestamp('approved_at');
    t.timestamps(true, true);
  });

  // ===== Email & Marketing =====
  await knex.schema.createTable('email_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('subject').notNullable();
    t.text('body');
    t.string('category');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('email_sequences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('status').defaultTo('draft');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('email_sequence_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('sequence_id').references('id').inTable('email_sequences').onDelete('CASCADE');
    t.uuid('template_id').references('id').inTable('email_templates');
    t.integer('step_order').defaultTo(0);
    t.integer('delay_days').defaultTo(0);
    t.string('step_type').defaultTo('email');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('email_sequence_enrollments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('sequence_id').references('id').inTable('email_sequences').onDelete('CASCADE');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.string('status').defaultTo('active');
    t.integer('current_step').defaultTo(0);
    t.timestamp('next_action_at');
    t.timestamps(true, true);
  });

  // ===== Landing Pages & Web Forms =====
  await knex.schema.createTable('landing_pages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.string('slug').unique();
    t.text('content');
    t.string('status').defaultTo('draft');
    t.jsonb('meta');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('web_form_captures', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('landing_page_id').references('id').inTable('landing_pages');
    t.string('name');
    t.string('email');
    t.string('phone');
    t.string('company');
    t.jsonb('custom_fields');
    t.string('source');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Marketing Journeys =====
  await knex.schema.createTable('marketing_journeys', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('status').defaultTo('draft');
    t.jsonb('steps').defaultTo('[]');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('journey_enrollments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('journey_id').references('id').inTable('marketing_journeys').onDelete('CASCADE');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.string('status').defaultTo('active');
    t.integer('current_step').defaultTo(0);
    t.timestamps(true, true);
  });

  // ===== Sales Automations =====
  await knex.schema.createTable('sales_automations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('trigger_type').notNullable();
    t.jsonb('trigger_config').defaultTo('{}');
    t.jsonb('actions').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sales_funnel_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.jsonb('stages').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  // ===== Rotten Deal Settings =====
  await knex.schema.createTable('rotten_deal_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('stage').notNullable();
    t.integer('days_threshold').notNullable();
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Integrations =====
  await knex.schema.createTable('integrations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('type').notNullable();
    t.string('status').defaultTo('inactive');
    t.jsonb('config').defaultTo('{}');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('configured_by');
    t.timestamps(true, true);
  });

  // ===== Tenant AI Configs =====
  await knex.schema.createTable('tenant_ai_configs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').unique();
    t.string('default_provider');
    t.jsonb('provider_configs').defaultTo('{}');
    t.boolean('ai_enabled').defaultTo(true);
    t.timestamps(true, true);
  });

  // ===== Tenant Audit Log =====
  await knex.schema.createTable('tenant_audit_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id');
    t.string('action').notNullable();
    t.string('entity_type');
    t.uuid('entity_id');
    t.jsonb('old_values');
    t.jsonb('new_values');
    t.string('ip_address');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Tenant Invitations =====
  await knex.schema.createTable('tenant_invitations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.string('email').notNullable();
    t.string('role').defaultTo('member');
    t.string('status').defaultTo('pending');
    t.string('token').unique();
    t.timestamp('expires_at');
    t.uuid('invited_by');
    t.timestamps(true, true);
  });

  // ===== Tenant Usage =====
  await knex.schema.createTable('tenant_usage', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.string('metric').notNullable();
    t.decimal('value', 18, 2).defaultTo(0);
    t.string('period');
    t.timestamps(true, true);
  });

  // ===== Organization Settings & Notes =====
  await knex.schema.createTable('organization_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.string('key').notNullable();
    t.jsonb('value');
    t.unique(['organization_id', 'key']);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('organization_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.text('content').notNullable();
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('organization_meetings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.timestamp('meeting_date').notNullable();
    t.text('minutes');
    t.specificType('attendees', 'text[]');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('organization_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.string('status').defaultTo('pending');
    t.uuid('assigned_to');
    t.date('due_date');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('organization_reminders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.timestamp('remind_at').notNullable();
    t.boolean('is_completed').defaultTo(false);
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Support Config =====
  await knex.schema.createTable('organization_support_config', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.jsonb('config').defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('organization_support_solutions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.string('solution_name').notNullable();
    t.text('description');
    t.string('status').defaultTo('active');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('organization_support_types', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations').onDelete('CASCADE');
    t.string('type_name').notNullable();
    t.text('description');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ===== Escalation Matrix =====
  await knex.schema.createTable('escalation_matrix_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.jsonb('levels').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('support_escalation_matrix', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations');
    t.integer('level').notNullable();
    t.uuid('contact_id');
    t.string('role');
    t.integer('response_time_hours');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('support_slas', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('severity').notNullable();
    t.integer('response_hours').notNullable();
    t.integer('resolution_hours').notNullable();
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('support_type_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('type_key').notNullable();
    t.text('description');
    t.jsonb('default_fields').defaultTo('{}');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Solution & Offerings =====
  await knex.schema.createTable('solution_documentation', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('content');
    t.string('category');
    t.string('solution_name');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('solution_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('id').inTable('alliance_organizations');
    t.string('solution_name').notNullable();
    t.string('plan');
    t.date('start_date');
    t.date('end_date');
    t.string('status').defaultTo('active');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('solution_expiry_notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('subscription_id').references('id').inTable('solution_subscriptions');
    t.string('notification_type');
    t.timestamp('sent_at');
    t.uuid('sent_to');
    t.timestamps(true, true);
  });

  // ===== OEM & Product Config =====
  await knex.schema.createTable('oem_technologies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('category');
    t.text('description');
    t.string('logo_url');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // Remaining offering tables (simple key-value / config tables)
  const offeringTables = [
    'offerings_managed_security', 'offerings_oems', 'offerings_offensive_security',
    'offerings_problem_areas', 'offerings_products', 'offerings_professional_services',
    'offerings_technologies', 'offering_problem_area_mappings',
    'product_oems', 'product_technologies', 'product_recommendation_steps',
  ];
  for (const tableName of offeringTables) {
    await knex.schema.createTable(tableName, (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      t.string('name');
      t.text('description');
      t.string('category');
      t.boolean('is_active').defaultTo(true);
      t.jsonb('metadata').defaultTo('{}');
      t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
      t.timestamps(true, true);
    });
  }

  // ===== Training =====
  await knex.schema.createTable('training_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('description');
    t.timestamp('start_time');
    t.timestamp('end_time');
    t.string('trainer');
    t.string('location');
    t.string('status').defaultTo('scheduled');
    t.integer('max_participants');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('training_registrations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('session_id').references('id').inTable('training_sessions').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.string('status').defaultTo('registered');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('learning_courses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('description');
    t.string('category');
    t.string('difficulty');
    t.integer('duration_hours');
    t.string('content_url');
    t.boolean('is_mandatory').defaultTo(false);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('learning_progress', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('course_id').references('id').inTable('learning_courses').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.integer('progress_percentage').defaultTo(0);
    t.string('status').defaultTo('not_started');
    t.timestamp('started_at');
    t.timestamp('completed_at');
    t.timestamps(true, true);
  });

  // ===== Video Calls & WebRTC =====
  await knex.schema.createTable('video_calls', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('room_id').unique().notNullable();
    t.uuid('created_by').notNullable();
    t.string('status').defaultTo('waiting');
    t.timestamp('started_at');
    t.timestamp('ended_at');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('remote_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('session_code').unique();
    t.uuid('host_id').notNullable();
    t.string('status').defaultTo('waiting');
    t.string('session_type').defaultTo('support');
    t.timestamp('started_at');
    t.timestamp('ended_at');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('remote_session_participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('session_id').references('id').inTable('remote_sessions').onDelete('CASCADE');
    t.uuid('user_id');
    t.string('role').defaultTo('viewer');
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.timestamp('left_at');
  });

  await knex.schema.createTable('remote_session_recordings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('session_id').references('id').inTable('remote_sessions').onDelete('CASCADE');
    t.string('recording_url');
    t.integer('duration_seconds');
    t.integer('file_size');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('webrtc_signals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('room_id').notNullable();
    t.uuid('sender_id').notNullable();
    t.uuid('target_id');
    t.string('signal_type').notNullable();
    t.jsonb('signal_data').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('expires_at');
  });

  // ===== IT Support Tickets (internal) =====
  // Reuses the tickets table - no additional table needed

  // ===== User Console Access =====
  await knex.schema.createTable('user_console_access', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.uuid('organization_id').references('id').inTable('alliance_organizations');
    t.string('console_type');
    t.string('access_level');
    t.boolean('is_active').defaultTo(true);
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Workflow generic tables =====
  await knex.schema.createTable('workflow_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('workflow_type').notNullable();
    t.jsonb('settings').defaultTo('{}');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.unique(['workflow_type', 'tenant_id']);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('workflow_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('workflow_type').notNullable();
    t.uuid('entity_id');
    t.string('action').notNullable();
    t.uuid('performed_by');
    t.jsonb('details');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('workflow_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('workflow_type').notNullable();
    t.uuid('entity_id').notNullable();
    t.uuid('user_id').notNullable();
    t.text('content').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('workflow_stage_completions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('workflow_type').notNullable();
    t.uuid('entity_id').notNullable();
    t.string('stage_name').notNullable();
    t.integer('stage_order');
    t.boolean('is_current').defaultTo(false);
    t.uuid('completed_by');
    t.timestamp('completed_at');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('workflow_stage_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('workflow_type');
    t.uuid('entity_id');
    t.string('from_stage');
    t.string('to_stage');
    t.uuid('changed_by');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // HR Workflow sub-tables
  await knex.schema.createTable('workflow_candidates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('workflow_id').references('id').inTable('hr_workflows');
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.string('status').defaultTo('active');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('workflow_interviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('workflow_id').references('id').inTable('hr_workflows');
    t.uuid('candidate_id').references('id').inTable('workflow_candidates');
    t.uuid('interviewer_id');
    t.string('interview_type');
    t.timestamp('scheduled_at');
    t.string('status').defaultTo('scheduled');
    t.text('feedback');
    t.integer('score');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('workflow_offers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('workflow_id').references('id').inTable('hr_workflows');
    t.uuid('candidate_id').references('id').inTable('workflow_candidates');
    t.string('position');
    t.decimal('salary', 18, 2);
    t.date('joining_date');
    t.string('status').defaultTo('draft');
    t.text('terms');
    t.timestamps(true, true);
  });

  // RFP Responses
  await knex.schema.createTable('rfp_responses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tender_id').references('id').inTable('tenders');
    t.string('title').notNullable();
    t.text('content');
    t.string('status').defaultTo('draft');
    t.uuid('created_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // Event Wishes
  await knex.schema.createTable('event_wishes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('event_id').references('id').inTable('employee_events');
    t.uuid('from_user_id').notNullable();
    t.uuid('to_user_id').notNullable();
    t.text('message');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Profiles Safe (view substitute as table)
  await knex.schema.createTable('profiles_safe', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id');
    t.string('full_name');
    t.string('avatar_url');
    t.string('department');
    t.string('designation');
    t.uuid('tenant_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop all tables in reverse order - comprehensive list
  const tables = [
    'profiles_safe', 'event_wishes', 'rfp_responses',
    'workflow_offers', 'workflow_interviews', 'workflow_candidates',
    'workflow_stage_history', 'workflow_stage_completions',
    'workflow_comments', 'workflow_logs', 'workflow_settings',
    'user_console_access', 'webrtc_signals',
    'remote_session_recordings', 'remote_session_participants', 'remote_sessions',
    'video_calls', 'learning_progress', 'learning_courses',
    'training_registrations', 'training_sessions',
    'product_recommendation_steps', 'product_technologies', 'product_oems',
    'offering_problem_area_mappings', 'offerings_technologies',
    'offerings_professional_services', 'offerings_products',
    'offerings_problem_areas', 'offerings_offensive_security',
    'offerings_oems', 'offerings_managed_security', 'oem_technologies',
    'solution_expiry_notifications', 'solution_subscriptions', 'solution_documentation',
    'support_type_templates', 'support_slas', 'support_escalation_matrix',
    'escalation_matrix_templates',
    'organization_support_types', 'organization_support_solutions', 'organization_support_config',
    'organization_reminders', 'organization_tasks', 'organization_meetings',
    'organization_notes', 'organization_settings',
    'tenant_usage', 'tenant_invitations', 'tenant_audit_log', 'tenant_ai_configs',
    'integrations', 'rotten_deal_settings',
    'sales_funnel_workflows', 'sales_automations',
    'journey_enrollments', 'marketing_journeys',
    'web_form_captures', 'landing_pages',
    'email_sequence_enrollments', 'email_sequence_steps', 'email_sequences', 'email_templates',
    'legal_document_approvals', 'legal_document_comments', 'legal_documents',
    'document_templates', 'team_reminders', 'team_chat_messages',
    'push_subscriptions', 'exchange_rate_history', 'fiscal_years',
    'tds_tcs_transactions', 'tds_tcs_rates', 'eway_bills', 'e_invoices',
    'gst_returns', 'gst_transactions', 'hsn_sac_master',
    'stock_ledger', 'stock_items', 'godowns', 'units_of_measure', 'stock_groups',
    'inventory_transactions', 'inventory_items',
    'interview_scorecards', 'offer_letters', 'job_applicants', 'job_postings',
    'employee_checklist_assignments', 'hr_checklists', 'hr_workflows',
    'order_processing_requests',
    'accounts_workflow_stage_completions', 'accounts_workflows',
    'post_sale_workflow_stages', 'post_sale_workflows',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
