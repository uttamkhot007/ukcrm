-- Create enum for support ticket types
CREATE TYPE public.support_ticket_type AS ENUM ('sales_query', 'technical_issue');

-- Create enum for sales query categories
CREATE TYPE public.sales_query_category AS ENUM ('license_issue', 'new_solution_required', 'additional_licenses_required');

-- Create enum for support ticket severity
CREATE TYPE public.support_ticket_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for support ticket status
CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed');

-- Create support periods table for organizations
CREATE TABLE public.organization_support_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE NOT NULL,
  support_start_date DATE,
  support_end_date DATE,
  sla_document_url TEXT,
  msa_document_url TEXT,
  support_level TEXT DEFAULT 'standard',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  UNIQUE(organization_id)
);

-- Create escalation matrix table
CREATE TABLE public.support_escalation_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE NOT NULL,
  solution_name TEXT NOT NULL,
  level_1_user_id UUID,
  level_1_email TEXT,
  level_1_response_hours INTEGER DEFAULT 4,
  level_2_user_id UUID,
  level_2_email TEXT,
  level_2_response_hours INTEGER DEFAULT 8,
  level_3_user_id UUID,
  level_3_email TEXT,
  level_3_response_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

-- Create customer support tickets table
CREATE TABLE public.customer_support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID NOT NULL,
  ticket_type support_ticket_type NOT NULL,
  
  -- Sales query specific fields
  sales_category sales_query_category,
  expected_response_hours INTEGER,
  
  -- Technical issue specific fields
  solution_service TEXT,
  issue_type TEXT,
  impact TEXT,
  
  -- Common fields
  title TEXT NOT NULL,
  description TEXT,
  severity support_ticket_severity NOT NULL DEFAULT 'medium',
  status support_ticket_status NOT NULL DEFAULT 'open',
  assigned_to UUID,
  assigned_team TEXT,
  
  sla_deadline TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

-- Create customer support ticket comments
CREATE TABLE public.customer_support_ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.customer_support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer support ticket history
CREATE TABLE public.customer_support_ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.customer_support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer users linking table (links auth users to organizations as customers)
CREATE TABLE public.customer_organization_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE NOT NULL,
  is_primary_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on all tables
ALTER TABLE public.organization_support_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_escalation_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_support_ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_organization_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_support_config
CREATE POLICY "Admins can manage support config" ON public.organization_support_config
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Customers can view their org support config" ON public.organization_support_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_organization_access coa
      WHERE coa.user_id = auth.uid() AND coa.organization_id = organization_support_config.organization_id
    )
  );

-- RLS Policies for support_escalation_matrix
CREATE POLICY "Admins can manage escalation matrix" ON public.support_escalation_matrix
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Customers can view their org escalation matrix" ON public.support_escalation_matrix
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_organization_access coa
      WHERE coa.user_id = auth.uid() AND coa.organization_id = support_escalation_matrix.organization_id
    )
  );

-- RLS Policies for customer_support_tickets
CREATE POLICY "Customers can create tickets for their org" ON public.customer_support_tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_organization_access coa
      WHERE coa.user_id = auth.uid() AND coa.organization_id = customer_support_tickets.organization_id
    ) AND auth.uid() = submitted_by
  );

CREATE POLICY "Customers can view their org tickets" ON public.customer_support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_organization_access coa
      WHERE coa.user_id = auth.uid() AND coa.organization_id = customer_support_tickets.organization_id
    )
  );

CREATE POLICY "Customers can update their own tickets" ON public.customer_support_tickets
  FOR UPDATE USING (submitted_by = auth.uid());

CREATE POLICY "Staff can manage all tickets" ON public.customer_support_tickets
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
  );

-- RLS Policies for customer_support_ticket_comments
CREATE POLICY "Users can create comments" ON public.customer_support_ticket_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Customers can view non-internal comments" ON public.customer_support_ticket_comments
  FOR SELECT USING (
    (is_internal = false AND EXISTS (
      SELECT 1 FROM public.customer_support_tickets cst
      JOIN public.customer_organization_access coa ON coa.organization_id = cst.organization_id
      WHERE cst.id = customer_support_ticket_comments.ticket_id AND coa.user_id = auth.uid()
    ))
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Staff can view all comments" ON public.customer_support_ticket_comments
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee'));

-- RLS Policies for customer_support_ticket_history
CREATE POLICY "Customers can view their ticket history" ON public.customer_support_ticket_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_support_tickets cst
      JOIN public.customer_organization_access coa ON coa.organization_id = cst.organization_id
      WHERE cst.id = customer_support_ticket_history.ticket_id AND coa.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage ticket history" ON public.customer_support_ticket_history
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee'));

-- RLS Policies for customer_organization_access
CREATE POLICY "Admins can manage customer access" ON public.customer_organization_access
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view their own access" ON public.customer_organization_access
  FOR SELECT USING (user_id = auth.uid());

-- Create function to generate support ticket number
CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ticket_number := 'SUP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger for ticket number generation
CREATE TRIGGER generate_support_ticket_number_trigger
  BEFORE INSERT ON public.customer_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_support_ticket_number();

-- Create function to set SLA based on severity
CREATE OR REPLACE FUNCTION public.set_support_ticket_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  CASE NEW.severity
    WHEN 'critical' THEN NEW.sla_deadline := NOW() + INTERVAL '2 hours';
    WHEN 'high' THEN NEW.sla_deadline := NOW() + INTERVAL '4 hours';
    WHEN 'medium' THEN NEW.sla_deadline := NOW() + INTERVAL '8 hours';
    WHEN 'low' THEN NEW.sla_deadline := NOW() + INTERVAL '24 hours';
    ELSE NEW.sla_deadline := NOW() + INTERVAL '8 hours';
  END CASE;
  RETURN NEW;
END;
$$;

-- Create trigger for SLA
CREATE TRIGGER set_support_ticket_sla_trigger
  BEFORE INSERT ON public.customer_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_support_ticket_sla();

-- Add update trigger for updated_at
CREATE TRIGGER update_customer_support_tickets_updated_at
  BEFORE UPDATE ON public.customer_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_support_config_updated_at
  BEFORE UPDATE ON public.organization_support_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_escalation_matrix_updated_at
  BEFORE UPDATE ON public.support_escalation_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add support solutions table for organizations
CREATE TABLE public.organization_support_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE NOT NULL,
  solution_name TEXT NOT NULL,
  service_name TEXT,
  issue_types TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

ALTER TABLE public.organization_support_solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage solutions" ON public.organization_support_solutions
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Customers can view their org solutions" ON public.organization_support_solutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_organization_access coa
      WHERE coa.user_id = auth.uid() AND coa.organization_id = organization_support_solutions.organization_id
    )
  );