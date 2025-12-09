-- Create a junction table to map problem areas to offerings
CREATE TABLE public.offering_problem_area_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offering_id UUID NOT NULL,
  offering_type TEXT NOT NULL CHECK (offering_type IN ('product', 'offensive_security', 'managed_security', 'professional_services')),
  problem_area_id UUID NOT NULL REFERENCES public.offerings_problem_areas(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(offering_id, problem_area_id)
);

-- Enable RLS
ALTER TABLE public.offering_problem_area_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view problem area mappings in their tenant"
ON public.offering_problem_area_mappings
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active')
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage problem area mappings"
ON public.offering_problem_area_mappings
FOR ALL
USING (
  public.is_tenant_admin(auth.uid(), tenant_id)
  OR public.is_super_admin(auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_offering_problem_mappings_offering ON public.offering_problem_area_mappings(offering_id, offering_type);
CREATE INDEX idx_offering_problem_mappings_problem_area ON public.offering_problem_area_mappings(problem_area_id);
CREATE INDEX idx_offering_problem_mappings_tenant ON public.offering_problem_area_mappings(tenant_id);