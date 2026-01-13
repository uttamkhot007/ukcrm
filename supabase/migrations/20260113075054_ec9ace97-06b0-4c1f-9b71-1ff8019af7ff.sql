-- Post-Sale Workflow System
-- Create enum for post-sale workflow types
CREATE TYPE post_sale_workflow_type AS ENUM (
  'odf_approval',
  'order_processing',
  'invoicing',
  'payment_collection',
  'support_onboarding',
  'managed_service_onboarding',
  'renewal_setup'
);

-- Create enum for post-sale workflow status
CREATE TYPE post_sale_workflow_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'on_hold'
);

-- Create post_sale_workflows table to track each workflow for a closed deal
CREATE TABLE public.post_sale_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workflow_type post_sale_workflow_type NOT NULL,
  status post_sale_workflow_status NOT NULL DEFAULT 'pending',
  current_stage TEXT,
  stage_progress INTEGER DEFAULT 0,
  order_type TEXT CHECK (order_type IN ('product', 'service', 'product_with_service')),
  includes_support BOOLEAN DEFAULT FALSE,
  includes_managed_service BOOLEAN DEFAULT FALSE,
  includes_renewal BOOLEAN DEFAULT FALSE,
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'full')),
  payment_received NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  metadata JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  UNIQUE(deal_id, workflow_type)
);

-- Create post_sale_workflow_stages table to track stage completions
CREATE TABLE public.post_sale_workflow_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.post_sale_workflows(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, stage_id)
);

-- Create customer_delivery table to track what's delivered to customer
CREATE TABLE public.customer_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.post_sale_workflows(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id),
  alliance_organization_id UUID REFERENCES public.alliance_organizations(id),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('product', 'service', 'support_access', 'managed_service')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'active', 'expired')),
  license_keys JSONB,
  support_portal_access BOOLEAN DEFAULT FALSE,
  support_portal_user_created BOOLEAN DEFAULT FALSE,
  support_contract_start DATE,
  support_contract_end DATE,
  managed_service_start DATE,
  managed_service_end DATE,
  renewal_date DATE,
  notes TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

-- Add indexes
CREATE INDEX idx_post_sale_workflows_deal ON public.post_sale_workflows(deal_id);
CREATE INDEX idx_post_sale_workflows_status ON public.post_sale_workflows(status);
CREATE INDEX idx_post_sale_workflows_type ON public.post_sale_workflows(workflow_type);
CREATE INDEX idx_post_sale_workflow_stages_workflow ON public.post_sale_workflow_stages(workflow_id);
CREATE INDEX idx_customer_deliveries_deal ON public.customer_deliveries(deal_id);
CREATE INDEX idx_customer_deliveries_type ON public.customer_deliveries(delivery_type);

-- Enable RLS
ALTER TABLE public.post_sale_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_sale_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_sale_workflows
CREATE POLICY "Users can view post_sale_workflows in their tenant"
ON public.post_sale_workflows FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create post_sale_workflows in their tenant"
ON public.post_sale_workflows FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update post_sale_workflows in their tenant"
ON public.post_sale_workflows FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

-- RLS Policies for post_sale_workflow_stages
CREATE POLICY "Users can view workflow stages"
ON public.post_sale_workflow_stages FOR SELECT
USING (workflow_id IN (
  SELECT id FROM public.post_sale_workflows WHERE tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Users can manage workflow stages"
ON public.post_sale_workflow_stages FOR ALL
USING (workflow_id IN (
  SELECT id FROM public.post_sale_workflows WHERE tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
));

-- RLS Policies for customer_deliveries
CREATE POLICY "Users can view customer_deliveries in their tenant"
ON public.customer_deliveries FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage customer_deliveries in their tenant"
ON public.customer_deliveries FOR ALL
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Add deal_type column to deals if not exists (to track product/service type)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS order_type TEXT CHECK (order_type IN ('product', 'service', 'product_with_service'));
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS includes_support BOOLEAN DEFAULT FALSE;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS includes_managed_service BOOLEAN DEFAULT FALSE;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS includes_renewal BOOLEAN DEFAULT FALSE;

-- Create trigger to update updated_at
CREATE TRIGGER update_post_sale_workflows_updated_at
BEFORE UPDATE ON public.post_sale_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_deliveries_updated_at
BEFORE UPDATE ON public.customer_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();