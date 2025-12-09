-- Create deal_registrations table for Deal Registration workflow
CREATE TABLE public.deal_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dr_number TEXT NOT NULL UNIQUE,
  deal_id UUID REFERENCES public.deals(id),
  requester_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_program TEXT,
  customer_organization_id UUID REFERENCES public.alliance_organizations(id),
  customer_name TEXT NOT NULL,
  opportunity_value NUMERIC DEFAULT 0,
  expected_close_date DATE,
  description TEXT,
  requirements TEXT,
  competitor_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'expired', 'closed')),
  assigned_to UUID,
  dr_id_from_vendor TEXT,
  dr_expiry_date DATE,
  approval_date DATE,
  rejection_reason TEXT,
  notes TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  sla_deadline TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger to generate DR number
CREATE OR REPLACE FUNCTION public.generate_dr_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dr_number := 'DR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_dr_number
  BEFORE INSERT ON public.deal_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_dr_number();

-- Create trigger to set SLA deadline based on priority
CREATE OR REPLACE FUNCTION public.set_dr_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.priority
    WHEN 'critical' THEN NEW.sla_deadline := NOW() + INTERVAL '4 hours';
    WHEN 'high' THEN NEW.sla_deadline := NOW() + INTERVAL '8 hours';
    WHEN 'medium' THEN NEW.sla_deadline := NOW() + INTERVAL '24 hours';
    WHEN 'low' THEN NEW.sla_deadline := NOW() + INTERVAL '48 hours';
    ELSE NEW.sla_deadline := NOW() + INTERVAL '24 hours';
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_dr_sla
  BEFORE INSERT ON public.deal_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_dr_sla_deadline();

-- Create trigger for updated_at
CREATE TRIGGER update_deal_registrations_updated_at
  BEFORE UPDATE ON public.deal_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create deal_registration_comments table
CREATE TABLE public.deal_registration_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_registration_id UUID NOT NULL REFERENCES public.deal_registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_registration_history table for audit trail
CREATE TABLE public.deal_registration_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_registration_id UUID NOT NULL REFERENCES public.deal_registrations(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_registration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_registration_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deal_registrations (using 'accounts' team which handles DR/Tender work)
CREATE POLICY "Users can view deal registrations they created or are assigned to"
ON public.deal_registrations
FOR SELECT
USING (
  requester_id = auth.uid() 
  OR assigned_to = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
  OR has_team(auth.uid(), 'sales')
  OR has_team(auth.uid(), 'accounts')
);

CREATE POLICY "Sales team can create deal registrations"
ON public.deal_registrations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Accounts team and admins can update deal registrations"
ON public.deal_registrations
FOR UPDATE
USING (
  requester_id = auth.uid()
  OR assigned_to = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
  OR has_team(auth.uid(), 'accounts')
);

-- RLS Policies for comments
CREATE POLICY "Users can view comments on accessible registrations"
ON public.deal_registration_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_id
    AND (
      dr.requester_id = auth.uid()
      OR dr.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_team(auth.uid(), 'accounts')
    )
  )
);

CREATE POLICY "Users can add comments to accessible registrations"
ON public.deal_registration_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_id
    AND (
      dr.requester_id = auth.uid()
      OR dr.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_team(auth.uid(), 'accounts')
    )
  )
);

-- RLS Policies for history
CREATE POLICY "Users can view history of accessible registrations"
ON public.deal_registration_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_id
    AND (
      dr.requester_id = auth.uid()
      OR dr.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_team(auth.uid(), 'accounts')
    )
  )
);

CREATE POLICY "System can insert history"
ON public.deal_registration_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_deal_registrations_requester ON public.deal_registrations(requester_id);
CREATE INDEX idx_deal_registrations_assigned ON public.deal_registrations(assigned_to);
CREATE INDEX idx_deal_registrations_status ON public.deal_registrations(status);
CREATE INDEX idx_deal_registrations_tenant ON public.deal_registrations(tenant_id);