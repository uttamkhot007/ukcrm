-- Add tenant_id to all core tables for proper tenant isolation

-- Contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON public.contacts(tenant_id);

-- Deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant ON public.deals(tenant_id);

-- Leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON public.leads(tenant_id);

-- Deal activities table
ALTER TABLE public.deal_activities ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_tenant ON public.deal_activities(tenant_id);

-- Invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);

-- Quotations table
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON public.quotations(tenant_id);

-- Tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON public.tickets(tenant_id);

-- Employee requests table
ALTER TABLE public.employee_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_tenant ON public.employee_requests(tenant_id);

-- Employee events table
ALTER TABLE public.employee_events ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_employee_events_tenant ON public.employee_events(tenant_id);

-- HR workflows table
ALTER TABLE public.hr_workflows ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_hr_workflows_tenant ON public.hr_workflows(tenant_id);

-- Legal documents table
ALTER TABLE public.legal_documents ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_tenant ON public.legal_documents(tenant_id);

-- Compliance frameworks table
ALTER TABLE public.compliance_frameworks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_tenant ON public.compliance_frameworks(tenant_id);

-- Renewals table
ALTER TABLE public.renewals ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_renewals_tenant ON public.renewals(tenant_id);

-- Notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);

-- Organization settings (one per tenant)
ALTER TABLE public.organization_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_settings_tenant ON public.organization_settings(tenant_id);

-- Order processing requests
ALTER TABLE public.order_processing_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_order_requests_tenant ON public.order_processing_requests(tenant_id);

-- Accounts workflows
ALTER TABLE public.accounts_workflows ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_accounts_workflows_tenant ON public.accounts_workflows(tenant_id);

-- Demo schedules
ALTER TABLE public.demo_schedules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_demo_schedules_tenant ON public.demo_schedules(tenant_id);

-- POC requests
ALTER TABLE public.poc_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_poc_requests_tenant ON public.poc_requests(tenant_id);

-- RFP responses
ALTER TABLE public.rfp_responses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_rfp_responses_tenant ON public.rfp_responses(tenant_id);

-- Technical assessments
ALTER TABLE public.technical_assessments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_technical_assessments_tenant ON public.technical_assessments(tenant_id);

-- Inside sales prospects
ALTER TABLE public.inside_sales_prospects ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_inside_sales_prospects_tenant ON public.inside_sales_prospects(tenant_id);

-- Contractors
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_contractors_tenant ON public.contractors(tenant_id);

-- Distributors
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_distributors_tenant ON public.distributors(tenant_id);

-- Vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON public.vendors(tenant_id);

-- SOPs
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_sops_tenant ON public.sops(tenant_id);

-- Now update existing data to assign to Vinca Cyber tenant
UPDATE public.contacts SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.deals SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.leads SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.invoices SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.tickets SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.employee_requests SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.employee_events SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.hr_workflows SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.legal_documents SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.compliance_frameworks SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.renewals SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.notifications SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.organization_settings SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.order_processing_requests SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.accounts_workflows SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.demo_schedules SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.poc_requests SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.inside_sales_prospects SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.contractors SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.distributors SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.attendance SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;
UPDATE public.employee_mood_logs SET tenant_id = 'efa85094-f30c-4004-812c-890fd6e748af' WHERE tenant_id IS NULL;

-- Create a helper function for tenant access check
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND status = 'active'
  ) OR public.is_super_admin(_user_id)
$$;

-- Update RLS policies for contacts to include tenant filtering
DROP POLICY IF EXISTS "Users can view all contacts" ON public.contacts;
CREATE POLICY "Users can view contacts in their tenant"
  ON public.contacts FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

DROP POLICY IF EXISTS "Users can create contacts" ON public.contacts;
CREATE POLICY "Users can create contacts in their tenant"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for deals
DROP POLICY IF EXISTS "Users can view all deals" ON public.deals;
CREATE POLICY "Users can view deals in their tenant"
  ON public.deals FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS policies for leads
DROP POLICY IF EXISTS "Users can view all leads" ON public.leads;
CREATE POLICY "Users can view leads in their tenant"
  ON public.leads FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS policies for invoices
DROP POLICY IF EXISTS "Users can view all invoices" ON public.invoices;
CREATE POLICY "Users can view invoices in their tenant"
  ON public.invoices FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS policies for employee events
DROP POLICY IF EXISTS "Everyone can view events" ON public.employee_events;
CREATE POLICY "Users can view events in their tenant"
  ON public.employee_events FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS policies for employee requests
DROP POLICY IF EXISTS "Users can view their own requests" ON public.employee_requests;
CREATE POLICY "Users can view requests in their tenant"
  ON public.employee_requests FOR SELECT
  USING (
    (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) AND
    (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id))
  );

-- Update RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications in tenant"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() = user_id AND
    (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id))
  );

-- Update RLS for inside sales prospects
DROP POLICY IF EXISTS "Users can view all inside sales prospects" ON public.inside_sales_prospects;
CREATE POLICY "Users can view prospects in their tenant"
  ON public.inside_sales_prospects FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for contractors
DROP POLICY IF EXISTS "Everyone can view contractors" ON public.contractors;
CREATE POLICY "Users can view contractors in their tenant"
  ON public.contractors FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for distributors
DROP POLICY IF EXISTS "Everyone can view distributors" ON public.distributors;
CREATE POLICY "Users can view distributors in their tenant"
  ON public.distributors FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for legal documents
DROP POLICY IF EXISTS "Users can view all legal documents" ON public.legal_documents;
CREATE POLICY "Users can view legal documents in their tenant"
  ON public.legal_documents FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for compliance frameworks
DROP POLICY IF EXISTS "Users can view frameworks" ON public.compliance_frameworks;
CREATE POLICY "Users can view frameworks in their tenant"
  ON public.compliance_frameworks FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for accounts workflows
DROP POLICY IF EXISTS "Users can view all accounts workflows" ON public.accounts_workflows;
CREATE POLICY "Users can view accounts workflows in their tenant"
  ON public.accounts_workflows FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for demo schedules
DROP POLICY IF EXISTS "Users can view all demos" ON public.demo_schedules;
CREATE POLICY "Users can view demos in their tenant"
  ON public.demo_schedules FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for POC requests
DROP POLICY IF EXISTS "Users can view POC requests" ON public.poc_requests;
CREATE POLICY "Users can view POCs in their tenant"
  ON public.poc_requests FOR SELECT
  USING (
    tenant_id IS NULL OR 
    public.user_has_tenant_access(auth.uid(), tenant_id)
  );

-- Update RLS for HR workflows
DROP POLICY IF EXISTS "Users can view relevant workflows" ON public.hr_workflows;
CREATE POLICY "Users can view HR workflows in their tenant"
  ON public.hr_workflows FOR SELECT
  USING (
    (initiated_by = auth.uid() OR assigned_to = auth.uid() OR target_user_id = auth.uid() OR 
     has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) AND
    (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id))
  );