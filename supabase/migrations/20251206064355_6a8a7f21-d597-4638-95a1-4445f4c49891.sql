
-- Create enums for ticketing
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'pending_customer', 'pending_vendor', 'escalated', 'resolved', 'closed');
CREATE TYPE public.ticket_category AS ENUM ('incident', 'service_request', 'change_request', 'problem', 'security_alert');

-- Create enums for billing
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid');
CREATE TYPE public.billing_frequency AS ENUM ('one_time', 'monthly', 'quarterly', 'annually');

-- Create enums for compliance
CREATE TYPE public.compliance_status AS ENUM ('not_started', 'in_progress', 'compliant', 'non_compliant', 'needs_review');
CREATE TYPE public.framework_type AS ENUM ('soc2', 'iso27001', 'hipaa', 'pci_dss', 'gdpr', 'nist', 'other');

-- =====================
-- TICKETING MODULE
-- =====================

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category ticket_category NOT NULL DEFAULT 'incident',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  contact_id UUID REFERENCES public.contacts(id),
  assigned_to UUID,
  escalated_to UUID,
  escalation_level INTEGER DEFAULT 0,
  sla_hours INTEGER NOT NULL DEFAULT 24,
  sla_deadline TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- BILLING MODULE
-- =====================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  contact_id UUID REFERENCES public.contacts(id),
  deal_id UUID REFERENCES public.deals(id),
  status invoice_status NOT NULL DEFAULT 'draft',
  billing_frequency billing_frequency NOT NULL DEFAULT 'one_time',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 18.00,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- COMPLIANCE MODULE
-- =====================

CREATE TABLE public.compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type framework_type NOT NULL,
  description TEXT,
  version TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.compliance_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.compliance_frameworks(id) ON DELETE CASCADE,
  control_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status compliance_status NOT NULL DEFAULT 'not_started',
  assigned_to UUID,
  due_date DATE,
  last_assessed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES public.compliance_controls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.compliance_frameworks(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assessor_id UUID NOT NULL,
  overall_status compliance_status NOT NULL DEFAULT 'in_progress',
  compliant_count INTEGER DEFAULT 0,
  non_compliant_count INTEGER DEFAULT 0,
  in_progress_count INTEGER DEFAULT 0,
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================
-- RLS POLICIES
-- =====================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_assessments ENABLE ROW LEVEL SECURITY;

-- Tickets policies
CREATE POLICY "Users can view all tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update tickets" ON public.tickets FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to OR 
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);
CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
);

-- Ticket comments policies
CREATE POLICY "Users can view ticket comments" ON public.ticket_comments FOR SELECT USING (true);
CREATE POLICY "Users can add ticket comments" ON public.ticket_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ticket history policies
CREATE POLICY "Users can view ticket history" ON public.ticket_history FOR SELECT USING (true);
CREATE POLICY "Users can add ticket history" ON public.ticket_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view all invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Users can create invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update invoices" ON public.invoices FOR UPDATE USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
);

-- Invoice items policies
CREATE POLICY "Users can view invoice items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Users can manage invoice items" ON public.invoice_items FOR ALL USING (true);

-- Payment records policies
CREATE POLICY "Users can view payments" ON public.payment_records FOR SELECT USING (true);
CREATE POLICY "Users can record payments" ON public.payment_records FOR INSERT WITH CHECK (auth.uid() = recorded_by);

-- Compliance frameworks policies
CREATE POLICY "Users can view frameworks" ON public.compliance_frameworks FOR SELECT USING (true);
CREATE POLICY "Admins can create frameworks" ON public.compliance_frameworks FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);
CREATE POLICY "Admins can update frameworks" ON public.compliance_frameworks FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);
CREATE POLICY "Admins can delete frameworks" ON public.compliance_frameworks FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Compliance controls policies
CREATE POLICY "Users can view controls" ON public.compliance_controls FOR SELECT USING (true);
CREATE POLICY "Users can manage controls" ON public.compliance_controls FOR ALL USING (true);

-- Compliance evidence policies
CREATE POLICY "Users can view evidence" ON public.compliance_evidence FOR SELECT USING (true);
CREATE POLICY "Users can upload evidence" ON public.compliance_evidence FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Compliance assessments policies
CREATE POLICY "Users can view assessments" ON public.compliance_assessments FOR SELECT USING (true);
CREATE POLICY "Admins can manage assessments" ON public.compliance_assessments FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- =====================
-- FUNCTIONS & TRIGGERS
-- =====================

-- Generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_number();

-- Set ticket SLA deadline
CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.priority
    WHEN 'critical' THEN NEW.sla_hours := 2;
    WHEN 'high' THEN NEW.sla_hours := 4;
    WHEN 'medium' THEN NEW.sla_hours := 8;
    WHEN 'low' THEN NEW.sla_hours := 24;
    ELSE NEW.sla_hours := 8;
  END CASE;
  NEW.sla_deadline := NOW() + (NEW.sla_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_sla_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_sla();

-- Generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();

-- Update timestamps
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_frameworks_updated_at
  BEFORE UPDATE ON public.compliance_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_controls_updated_at
  BEFORE UPDATE ON public.compliance_controls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_assessments_updated_at
  BEFORE UPDATE ON public.compliance_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
