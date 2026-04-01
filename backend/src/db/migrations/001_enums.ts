import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create all enum types
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE app_role AS ENUM ('admin', 'manager', 'employee');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE closed_won_substage AS ENUM ('order_processing', 'invoicing', 'payment_pending', 'payment_received', 'delivered', 'completed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE compliance_status AS ENUM ('not_started', 'in_progress', 'compliant', 'non_compliant', 'needs_review');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE data_region AS ENUM ('us-east', 'us-west', 'eu-central', 'ap-south', 'ap-southeast');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE deal_stage AS ENUM ('pipeline', 'qualified', 'proposal', 'negotiation', 'upside', 'strong_upside', 'commit', 'closed_won', 'closed_lost');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE demo_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE employment_status AS ENUM ('active', 'probation', 'pip', 'notice_period', 'inactive', 'terminated');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE framework_type AS ENUM ('soc2', 'iso27001', 'hipaa', 'pci_dss', 'gdpr', 'nist', 'other');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE hr_workflow_status AS ENUM ('draft', 'active', 'pending_approval', 'approved', 'rejected', 'completed', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE hr_workflow_type AS ENUM ('onboarding', 'offboarding', 'retention');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'converted');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE legal_document_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'revision_needed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE legal_document_type AS ENUM ('contract', 'nda', 'agreement', 'policy', 'compliance');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE offboarding_stage AS ENUM ('resignation_submitted', 'manager_review', 'retention_review', 'exit_approved', 'knowledge_transfer', 'asset_return', 'exit_interview', 'final_settlement', 'completed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE onboarding_stage AS ENUM ('requirement_submitted', 'hr_sourcing', 'profile_review', 'manager_interview', 'senior_interview', 'ceo_interview', 'management_interview', 'offer_preparation', 'offer_sent', 'offer_accepted', 'completed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE poc_status AS ENUM ('requested', 'planning', 'in_progress', 'completed', 'cancelled', 'converted');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE post_sale_workflow_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'on_hold');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE post_sale_workflow_type AS ENUM ('odf_approval', 'order_processing', 'invoicing', 'payment_collection', 'support_onboarding', 'managed_service_onboarding', 'renewal_setup');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE renewal_status AS ENUM ('active', 'expiring_soon', 'expired', 'renewed', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE renewal_type AS ENUM ('contract', 'license', 'subscription', 'certification', 'insurance', 'domain');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE request_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'completed', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE request_type AS ENUM ('leave', 'work_from_home', 'advance_salary', 'new_hardware', 'hardware_problem', 'other');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE sales_query_category AS ENUM ('license_issue', 'new_solution_required', 'additional_licenses_required');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE sales_sub_team AS ENUM ('commercial', 'enterprise_govt', 'bfsi', 'international', 'alliance_india');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE support_ticket_severity AS ENUM ('low', 'medium', 'high', 'critical');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE support_ticket_type AS ENUM ('sales_query', 'technical_issue');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE team_type AS ENUM ('sales', 'presales', 'technical', 'managed_services', 'management', 'hr', 'finance', 'inside_sales', 'marketing', 'renewals', 'accounts', 'admin', 'mss', 'offensive');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE tenant_status AS ENUM ('pending', 'active', 'suspended', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE tenant_tier AS ENUM ('starter', 'professional', 'enterprise');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE tender_source AS ENUM ('government', 'private', 'psu', 'referral', 'portal', 'direct');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE tender_status AS ENUM ('identified', 'evaluating', 'bid_preparation', 'submitted', 'under_evaluation', 'won', 'lost', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_category AS ENUM ('incident', 'service_request', 'change_request', 'problem', 'security_alert');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending_customer', 'pending_vendor', 'escalated', 'resolved', 'closed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE user_category AS ENUM ('employee', 'contractor', 'vendor', 'distributor', 'customer');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  const enums = [
    'app_role', 'closed_won_substage', 'compliance_status', 'data_region',
    'deal_stage', 'demo_status', 'employment_status', 'framework_type',
    'hr_workflow_status', 'hr_workflow_type', 'invoice_status', 'lead_status',
    'legal_document_status', 'legal_document_type', 'offboarding_stage',
    'onboarding_stage', 'poc_status', 'post_sale_workflow_status',
    'post_sale_workflow_type', 'quotation_status', 'renewal_status',
    'renewal_type', 'request_priority', 'request_status', 'request_type',
    'sales_query_category', 'sales_sub_team', 'support_ticket_severity',
    'support_ticket_status', 'support_ticket_type', 'team_type',
    'tenant_status', 'tenant_tier', 'tender_source', 'tender_status',
    'ticket_category', 'ticket_priority', 'ticket_status', 'user_category',
  ];
  for (const e of enums) {
    await knex.raw(`DROP TYPE IF EXISTS ${e} CASCADE`);
  }
}
