-- Create sales_targets table for tracking sales team member targets
CREATE TABLE public.sales_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  target_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  top_line_target NUMERIC NOT NULL DEFAULT 0,
  bottom_line_target NUMERIC NOT NULL DEFAULT 0,
  incentive_eligibility_cap NUMERIC NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(user_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view targets in their tenant"
  ON public.sales_targets
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage targets in their tenant"
  ON public.sales_targets
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_sales_targets_updated_at
  BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();