-- Create table for product recommendation steps
CREATE TABLE public.product_recommendation_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.offerings_products(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  step_type TEXT NOT NULL CHECK (step_type IN ('sow', 'poc', 'implementation', 'sop')),
  team_type TEXT NOT NULL CHECK (team_type IN ('technical', 'solution_engineering')),
  step_order INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  details TEXT,
  duration_estimate TEXT,
  prerequisites TEXT[],
  deliverables TEXT[],
  resources TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.product_recommendation_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view recommendation steps for their tenant"
ON public.product_recommendation_steps
FOR SELECT
USING (
  tenant_id IS NULL 
  OR tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active')
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage recommendation steps"
ON public.product_recommendation_steps
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_super_admin(auth.uid())
  OR public.has_any_team(auth.uid(), ARRAY['technical'::team_type, 'presales'::team_type])
);

-- Create trigger for updated_at
CREATE TRIGGER update_product_recommendation_steps_updated_at
BEFORE UPDATE ON public.product_recommendation_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_product_recommendation_steps_product ON public.product_recommendation_steps(product_id);
CREATE INDEX idx_product_recommendation_steps_type ON public.product_recommendation_steps(step_type, team_type);

-- Insert sample recommendation steps for common cybersecurity products
-- These will serve as templates that can be customized per product