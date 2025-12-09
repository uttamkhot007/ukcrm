
-- Create solution documentation table for POC and Implementation plans
CREATE TABLE public.solution_documentation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.offerings_products(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('poc', 'implementation')),
  title TEXT NOT NULL,
  customer_name TEXT,
  problem_statement TEXT,
  proposed_solution TEXT,
  scope_inclusions TEXT[] DEFAULT '{}',
  scope_exclusions TEXT[] DEFAULT '{}',
  use_cases JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  raci_matrix JSONB DEFAULT '[]',
  additional_notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'active', 'completed')),
  created_by UUID NOT NULL,
  assigned_to UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solution_documentation ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view solution documentation in their tenant"
ON public.solution_documentation FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active')
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can create solution documentation"
ON public.solution_documentation FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update solution documentation"
ON public.solution_documentation FOR UPDATE
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can delete their own solution documentation"
ON public.solution_documentation FOR DELETE
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_super_admin(auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_solution_documentation_updated_at
BEFORE UPDATE ON public.solution_documentation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_solution_documentation_product ON public.solution_documentation(product_id);
CREATE INDEX idx_solution_documentation_tenant ON public.solution_documentation(tenant_id);
CREATE INDEX idx_solution_documentation_type ON public.solution_documentation(doc_type);
CREATE INDEX idx_solution_documentation_status ON public.solution_documentation(status);
