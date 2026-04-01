import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ===== Ticket sub-tables =====
  await knex.schema.createTable('ticket_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.text('content').notNullable();
    t.boolean('is_internal').defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ticket_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
    t.string('field_name').notNullable();
    t.string('old_value');
    t.string('new_value');
    t.uuid('changed_by');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Projects =====
  await knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('project_number').unique();
    t.string('name').notNullable();
    t.text('description');
    t.string('status').defaultTo('planning');
    t.string('priority').defaultTo('medium');
    t.date('start_date');
    t.date('end_date');
    t.date('actual_end_date');
    t.decimal('budget', 18, 2);
    t.decimal('actual_cost', 18, 2);
    t.integer('completion_percentage').defaultTo(0);
    t.uuid('project_manager_id');
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('task_number');
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.string('status').defaultTo('todo');
    t.string('priority').defaultTo('medium');
    t.uuid('assigned_to');
    t.date('due_date');
    t.integer('estimated_hours');
    t.integer('actual_hours');
    t.uuid('parent_task_id');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.string('role').defaultTo('member');
    t.unique(['project_id', 'user_id']);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_milestones', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.date('due_date');
    t.string('status').defaultTo('pending');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_phases', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description');
    t.integer('order_index').defaultTo(0);
    t.string('status').defaultTo('pending');
    t.date('start_date');
    t.date('end_date');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('file_url');
    t.string('file_type');
    t.integer('file_size');
    t.uuid('uploaded_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_time_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('task_id').references('id').inTable('project_tasks');
    t.uuid('user_id').notNullable();
    t.decimal('hours', 5, 2).notNullable();
    t.date('entry_date').notNullable();
    t.text('description');
    t.boolean('is_billable').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('product_name').notNullable();
    t.integer('quantity').defaultTo(1);
    t.decimal('unit_cost', 18, 2).defaultTo(0);
    t.text('notes');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_raci', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('activity').notNullable();
    t.uuid('responsible_id');
    t.uuid('accountable_id');
    t.specificType('consulted_ids', 'uuid[]');
    t.specificType('informed_ids', 'uuid[]');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('project_stakeholders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('role');
    t.string('email');
    t.string('phone');
    t.string('organization');
    t.text('notes');
    t.timestamps(true, true);
  });

  // ===== Tenders =====
  await knex.schema.createTable('tenders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('tender_number').unique();
    t.string('title').notNullable();
    t.text('description');
    t.specificType('status', 'tender_status').defaultTo('identified');
    t.specificType('source', 'tender_source').defaultTo('government');
    t.string('issuing_authority');
    t.decimal('estimated_value', 18, 2);
    t.decimal('bid_amount', 18, 2);
    t.date('published_date');
    t.date('submission_deadline');
    t.date('opening_date');
    t.string('emd_amount');
    t.string('category');
    t.uuid('assigned_to');
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tender_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tender_id').references('id').inTable('tenders').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('file_url');
    t.string('document_type');
    t.uuid('uploaded_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tender_activities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tender_id').references('id').inTable('tenders').onDelete('CASCADE');
    t.string('activity_type').notNullable();
    t.text('description');
    t.uuid('user_id');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tender_team', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tender_id').references('id').inTable('tenders').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.string('role');
    t.unique(['tender_id', 'user_id']);
    t.timestamps(true, true);
  });

  // ===== Tender Workspaces =====
  await knex.schema.createTable('tender_workspaces', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tender_id').references('id').inTable('tenders').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.string('status').defaultTo('active');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('tender_workspace_sections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('workspace_id').references('id').inTable('tender_workspaces').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('content');
    t.integer('order_index').defaultTo(0);
    t.string('section_type').defaultTo('text');
    t.uuid('assigned_to');
    t.string('status').defaultTo('draft');
    t.timestamps(true, true);
  });

  // ===== SOPs =====
  await knex.schema.createTable('sops', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.text('description');
    t.text('content');
    t.string('category');
    t.string('status').defaultTo('draft');
    t.integer('version').defaultTo(1);
    t.string('department');
    t.uuid('created_by').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sop_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('sop_id').references('id').inTable('sops').onDelete('CASCADE');
    t.integer('version_number').notNullable();
    t.text('content');
    t.text('change_notes');
    t.uuid('created_by');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sop_images', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('sop_id').references('id').inTable('sops').onDelete('CASCADE');
    t.string('image_url').notNullable();
    t.string('caption');
    t.integer('order_index').defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Customer Support =====
  await knex.schema.createTable('customer_support_contracts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('contract_name').notNullable();
    t.string('contract_type').defaultTo('standard');
    t.uuid('organization_id').references('id').inTable('alliance_organizations');
    t.uuid('deal_id').references('id').inTable('deals');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.integer('sla_response_hours');
    t.integer('sla_resolution_hours');
    t.specificType('assigned_technical_team', 'text[]');
    t.jsonb('escalation_matrix');
    t.jsonb('license_details');
    t.jsonb('solution_details');
    t.jsonb('support_contacts');
    t.string('status').defaultTo('active');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('customer_support_tickets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('ticket_number').notNullable();
    t.string('title').notNullable();
    t.text('description');
    t.specificType('ticket_type', 'support_ticket_type').notNullable();
    t.specificType('severity', 'support_ticket_severity').defaultTo('medium');
    t.specificType('status', 'support_ticket_status').defaultTo('open');
    t.specificType('sales_category', 'sales_query_category');
    t.string('issue_type');
    t.string('impact');
    t.string('solution_service');
    t.uuid('organization_id').references('id').inTable('alliance_organizations');
    t.uuid('submitted_by').notNullable();
    t.uuid('assigned_to');
    t.string('assigned_team');
    t.integer('expected_response_hours');
    t.timestamp('sla_deadline');
    t.timestamp('resolved_at');
    t.text('resolution_notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('customer_support_ticket_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('ticket_id').references('id').inTable('customer_support_tickets').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.text('content').notNullable();
    t.boolean('is_internal').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('customer_support_ticket_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('ticket_id').references('id').inTable('customer_support_tickets').onDelete('CASCADE');
    t.string('action').notNullable();
    t.string('old_value');
    t.string('new_value');
    t.uuid('user_id');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Customer Deliveries =====
  await knex.schema.createTable('customer_deliveries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.uuid('alliance_organization_id').references('id').inTable('alliance_organizations');
    t.string('delivery_type').notNullable();
    t.string('status').defaultTo('pending');
    t.timestamp('delivered_at');
    t.uuid('delivered_by');
    t.jsonb('license_keys');
    t.date('support_contract_start');
    t.date('support_contract_end');
    t.date('managed_service_start');
    t.date('managed_service_end');
    t.date('renewal_date');
    t.boolean('support_portal_access').defaultTo(false);
    t.boolean('support_portal_user_created').defaultTo(false);
    t.text('notes');
    t.uuid('workflow_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Customer Organization Access =====
  await knex.schema.createTable('customer_organization_access', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.uuid('organization_id').references('id').inTable('alliance_organizations');
    t.boolean('is_primary_contact').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ===== Cybersecurity News =====
  await knex.schema.createTable('cybersecurity_news', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('title').notNullable();
    t.string('category').notNullable();
    t.text('summary');
    t.text('full_content');
    t.string('severity');
    t.string('source_name');
    t.string('source_url');
    t.specificType('affected_systems', 'text[]');
    t.specificType('recommendations', 'text[]');
    t.boolean('is_published').defaultTo(false);
    t.timestamp('published_at');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Cynet Licenses =====
  await knex.schema.createTable('cynet_licenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('cynet_id').notNullable();
    t.string('site_name').notNullable();
    t.uuid('organization_id').references('id').inTable('alliance_organizations');
    t.string('parent_cynet_id');
    t.string('parent_name');
    t.string('hierarchy_path');
    t.integer('procured_licenses');
    t.integer('assigned_endpoints');
    t.integer('endpoints_used');
    t.integer('total_groups');
    t.integer('integrations_count');
    t.string('integrations_info');
    t.decimal('monthly_data_ingestion', 18, 2);
    t.string('clm_retention');
    t.string('billing_type');
    t.string('status').defaultTo('active');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  // ===== Daily Activities =====
  await knex.schema.createTable('daily_activities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.date('activity_date').defaultTo(knex.fn.now());
    t.string('activity_type').notNullable();
    t.string('activity_category').notNullable();
    t.string('activity_subtype');
    t.uuid('activity_definition_id').references('id').inTable('activity_definitions');
    t.text('description');
    t.integer('duration_minutes').defaultTo(0);
    t.string('outcome');
    t.string('location_type');
    t.uuid('related_deal_id').references('id').inTable('deals');
    t.uuid('related_organization_id').references('id').inTable('alliance_organizations');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Presales =====
  await knex.schema.createTable('presales_opportunities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals');
    t.string('title').notNullable();
    t.text('requirements');
    t.string('status').defaultTo('new');
    t.uuid('assigned_to');
    t.string('priority').defaultTo('medium');
    t.text('technical_notes');
    t.jsonb('solution_design');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== POC Requests =====
  await knex.schema.createTable('poc_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('presales_id').references('id').inTable('presales_opportunities');
    t.string('title').notNullable();
    t.text('description');
    t.specificType('status', 'poc_status').defaultTo('requested');
    t.date('start_date');
    t.date('end_date');
    t.text('success_criteria');
    t.text('results');
    t.uuid('assigned_to');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Demo Schedules =====
  await knex.schema.createTable('demo_schedules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('contact_id').references('id').inTable('contacts');
    t.string('title').notNullable();
    t.text('description');
    t.timestamp('scheduled_at').notNullable();
    t.integer('duration_minutes').defaultTo(60);
    t.specificType('status', 'demo_status').defaultTo('scheduled');
    t.string('meeting_link');
    t.uuid('presenter_id');
    t.text('notes');
    t.text('feedback');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Technical Assessments =====
  await knex.schema.createTable('technical_assessments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('deal_id').references('id').inTable('deals');
    t.uuid('presales_id').references('id').inTable('presales_opportunities');
    t.string('title').notNullable();
    t.text('description');
    t.string('status').defaultTo('pending');
    t.jsonb('assessment_data');
    t.text('findings');
    t.text('recommendations');
    t.uuid('assessor_id');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by').notNullable();
    t.timestamps(true, true);
  });

  // ===== Payment Records =====
  await knex.schema.createTable('payment_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('invoice_id').references('id').inTable('invoices');
    t.uuid('deal_id').references('id').inTable('deals');
    t.decimal('amount', 18, 2).notNullable();
    t.date('payment_date');
    t.string('payment_method');
    t.string('reference_number');
    t.string('status').defaultTo('completed');
    t.text('notes');
    t.uuid('recorded_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Employee additional tables =====
  await knex.schema.createTable('employee_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('document_type').notNullable();
    t.string('title').notNullable();
    t.string('file_url');
    t.string('file_name');
    t.string('status').defaultTo('pending');
    t.date('expiry_date');
    t.uuid('uploaded_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('employee_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('event_type').notNullable();
    t.string('title').notNullable();
    t.date('event_date').notNullable();
    t.boolean('is_recurring').defaultTo(false);
    t.uuid('created_by').notNullable();
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('employee_achievements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('title').notNullable();
    t.text('description');
    t.string('achievement_type');
    t.date('achieved_date');
    t.uuid('awarded_by');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('employee_awards', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('award_name').notNullable();
    t.text('description');
    t.date('award_date');
    t.uuid('nominated_by');
    t.uuid('approved_by');
    t.string('status').defaultTo('nominated');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('employee_certifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('certification_name').notNullable();
    t.string('issuing_organization');
    t.date('issue_date');
    t.date('expiry_date');
    t.string('credential_id');
    t.string('credential_url');
    t.string('status').defaultTo('active');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('employee_mood_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('mood').notNullable();
    t.text('notes');
    t.date('log_date').defaultTo(knex.fn.now());
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('employee_verifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.string('verification_type').notNullable();
    t.string('status').defaultTo('pending');
    t.uuid('verified_by');
    t.timestamp('verified_at');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('verification_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('verification_id').references('id').inTable('employee_verifications').onDelete('CASCADE');
    t.string('document_type').notNullable();
    t.string('file_url');
    t.string('file_name');
    t.uuid('uploaded_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('employee_sales_teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.uuid('team_id').references('id').inTable('sales_teams');
    t.string('role').defaultTo('member');
    t.unique(['user_id', 'team_id']);
    t.timestamps(true, true);
  });

  // ===== Resignation =====
  await knex.schema.createTable('resignation_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable();
    t.date('resignation_date').notNullable();
    t.date('last_working_day');
    t.text('reason');
    t.specificType('stage', 'offboarding_stage').defaultTo('resignation_submitted');
    t.string('status').defaultTo('pending');
    t.uuid('reviewed_by');
    t.text('review_notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Onboarding Requests =====
  await knex.schema.createTable('onboarding_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('position').notNullable();
    t.string('department');
    t.text('requirements');
    t.specificType('stage', 'onboarding_stage').defaultTo('requirement_submitted');
    t.string('status').defaultTo('pending');
    t.uuid('requested_by').notNullable();
    t.uuid('hiring_manager_id');
    t.integer('headcount').defaultTo(1);
    t.string('priority').defaultTo('medium');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Product Catalog =====
  await knex.schema.createTable('product_catalog', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.string('sku');
    t.string('category');
    t.decimal('price', 18, 2).defaultTo(0);
    t.string('currency').defaultTo('INR');
    t.boolean('is_active').defaultTo(true);
    t.jsonb('features');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ===== Vendors & Distributors =====
  await knex.schema.createTable('vendors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.text('address');
    t.string('gst_number');
    t.string('pan_number');
    t.string('category');
    t.string('status').defaultTo('active');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('distributors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('email');
    t.string('phone');
    t.text('address');
    t.string('region');
    t.string('status').defaultTo('active');
    t.text('notes');
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('created_by');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'distributors', 'vendors', 'product_catalog',
    'onboarding_requests', 'resignation_requests',
    'employee_sales_teams', 'verification_documents', 'employee_verifications',
    'employee_mood_logs', 'employee_certifications', 'employee_awards',
    'employee_achievements', 'employee_events', 'employee_documents',
    'payment_records', 'technical_assessments', 'demo_schedules',
    'poc_requests', 'presales_opportunities', 'daily_activities',
    'cynet_licenses', 'cybersecurity_news', 'customer_organization_access',
    'customer_deliveries', 'customer_support_ticket_history',
    'customer_support_ticket_comments', 'customer_support_tickets',
    'customer_support_contracts',
    'sop_images', 'sop_versions', 'sops',
    'tender_workspace_sections', 'tender_workspaces',
    'tender_team', 'tender_activities', 'tender_documents', 'tenders',
    'project_stakeholders', 'project_raci', 'project_products',
    'project_time_entries', 'project_documents', 'project_phases',
    'project_milestones', 'project_members', 'project_tasks', 'projects',
    'ticket_history', 'ticket_comments',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
