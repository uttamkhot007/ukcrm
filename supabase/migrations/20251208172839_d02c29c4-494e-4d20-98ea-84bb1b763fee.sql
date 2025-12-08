-- Create solution subscriptions table to track customer solution expiries
CREATE TABLE public.solution_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
  solution_name TEXT NOT NULL,
  vendor TEXT,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  license_count INTEGER,
  annual_value NUMERIC(12,2),
  status TEXT DEFAULT 'active',
  notes TEXT,
  reseller_id UUID REFERENCES public.alliance_organizations(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solution_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view solution subscriptions for their tenant"
ON public.solution_subscriptions FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert solution subscriptions for their tenant"
ON public.solution_subscriptions FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update solution subscriptions for their tenant"
ON public.solution_subscriptions FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete solution subscriptions for their tenant"
ON public.solution_subscriptions FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_solution_subscriptions_updated_at
BEFORE UPDATE ON public.solution_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create solution expiry notifications table
CREATE TABLE public.solution_expiry_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  subscription_id UUID REFERENCES public.solution_subscriptions(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_to UUID[],
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solution_expiry_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view expiry notifications for their tenant"
ON public.solution_expiry_notifications FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert expiry notifications for their tenant"
ON public.solution_expiry_notifications FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update expiry notifications for their tenant"
ON public.solution_expiry_notifications FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));