-- Create order_processing_requests table for storing ODF details
CREATE TABLE public.order_processing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflow_logs(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  
  -- Customer & Order Details
  customer_po_number TEXT,
  customer_po_date DATE,
  customer_payment_terms TEXT,
  customer_commitments TEXT,
  
  -- Distributor/OEM Details  
  distributor_oem_name TEXT,
  distri_oem_payment_terms TEXT,
  distri_oem_quote_number TEXT,
  
  -- Financial Details
  buying_cost NUMERIC DEFAULT 0,
  selling_cost NUMERIC DEFAULT 0,
  referral_fees NUMERIC DEFAULT 0,
  margin_amount NUMERIC GENERATED ALWAYS AS (selling_cost - buying_cost - referral_fees) STORED,
  margin_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN selling_cost > 0 THEN ((selling_cost - buying_cost - referral_fees) / selling_cost * 100) ELSE 0 END
  ) STORED,
  
  -- Delivery Timelines
  license_delivery_date DATE,
  service_delivery_date DATE,
  license_delivery_notes TEXT,
  service_delivery_notes TEXT,
  
  -- Prerequisites & Documents
  prerequisite_documents JSONB DEFAULT '[]'::jsonb, -- Array of required docs: MSA, NDA, SOW, SLA etc.
  has_msa BOOLEAN DEFAULT false,
  has_nda BOOLEAN DEFAULT false,
  has_sow BOOLEAN DEFAULT false,
  has_sla BOOLEAN DEFAULT false,
  other_prerequisites TEXT,
  
  -- Document URLs (uploaded files)
  customer_po_url TEXT,
  distri_oem_quote_url TEXT,
  other_documents JSONB DEFAULT '[]'::jsonb, -- Array of {name, url} objects
  
  -- Workflow Status
  status TEXT NOT NULL DEFAULT 'draft',
  current_stage TEXT NOT NULL DEFAULT 'document_review',
  order_committee_approved BOOLEAN DEFAULT false,
  order_committee_approved_by UUID,
  order_committee_approved_at TIMESTAMPTZ,
  order_committee_notes TEXT,
  
  -- PO Details (filled by accounts)
  accounts_po_number TEXT,
  accounts_po_date DATE,
  accounts_po_url TEXT,
  accounts_po_shared_at TIMESTAMPTZ,
  accounts_po_shared_to TEXT, -- Email or contact info
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_processing_requests ENABLE ROW LEVEL SECURITY;

-- Create accounts_workflows table for tracking accounts workflow stages
CREATE TABLE public.accounts_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_type TEXT NOT NULL, -- 'order_processing', 'payment_collection'
  title TEXT NOT NULL,
  description TEXT,
  deal_id UUID REFERENCES public.deals(id),
  order_request_id UUID REFERENCES public.order_processing_requests(id),
  parent_workflow_id UUID REFERENCES public.accounts_workflows(id), -- For auto-created workflows
  
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, on_hold, completed, cancelled
  current_stage TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  
  initiated_by UUID NOT NULL,
  assigned_to UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts_workflows ENABLE ROW LEVEL SECURITY;

-- Create accounts_workflow_stage_completions table
CREATE TABLE public.accounts_workflow_stage_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.accounts_workflows(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workflow_id, stage_id)
);

-- Enable RLS
ALTER TABLE public.accounts_workflow_stage_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_processing_requests
CREATE POLICY "Users can view all order processing requests"
  ON public.order_processing_requests FOR SELECT
  USING (true);

CREATE POLICY "Sales users can create order processing requests"
  ON public.order_processing_requests FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update order processing requests"
  ON public.order_processing_requests FOR UPDATE
  USING (
    auth.uid() = created_by OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_team(auth.uid(), 'accounts'::team_type)
  );

-- RLS Policies for accounts_workflows
CREATE POLICY "Users can view all accounts workflows"
  ON public.accounts_workflows FOR SELECT
  USING (true);

CREATE POLICY "Users can create accounts workflows"
  ON public.accounts_workflows FOR INSERT
  WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Users can update accounts workflows"
  ON public.accounts_workflows FOR UPDATE
  USING (
    auth.uid() = initiated_by OR 
    auth.uid() = assigned_to OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins can delete accounts workflows"
  ON public.accounts_workflows FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for accounts_workflow_stage_completions
CREATE POLICY "Users can view stage completions"
  ON public.accounts_workflow_stage_completions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage stage completions"
  ON public.accounts_workflow_stage_completions FOR ALL
  USING (true);

-- Add indexes for performance
CREATE INDEX idx_order_processing_requests_deal ON public.order_processing_requests(deal_id);
CREATE INDEX idx_order_processing_requests_status ON public.order_processing_requests(status);
CREATE INDEX idx_accounts_workflows_type ON public.accounts_workflows(workflow_type);
CREATE INDEX idx_accounts_workflows_status ON public.accounts_workflows(status);
CREATE INDEX idx_accounts_workflows_deal ON public.accounts_workflows(deal_id);
CREATE INDEX idx_accounts_workflow_stages_workflow ON public.accounts_workflow_stage_completions(workflow_id);

-- Update trigger for updated_at
CREATE TRIGGER update_order_processing_requests_updated_at
  BEFORE UPDATE ON public.order_processing_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_workflows_updated_at
  BEFORE UPDATE ON public.accounts_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();