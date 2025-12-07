-- Create junction table for Solution-OEM relationships (many-to-many)
CREATE TABLE public.solution_oems (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES public.offerings_solutions(id) ON DELETE CASCADE,
  oem_id uuid NOT NULL REFERENCES public.offerings_oems(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(solution_id, oem_id)
);

-- Create junction table for Solution-Technology relationships (many-to-many)
CREATE TABLE public.solution_technologies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES public.offerings_solutions(id) ON DELETE CASCADE,
  technology_id uuid NOT NULL REFERENCES public.offerings_technologies(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(solution_id, technology_id)
);

-- Enable RLS
ALTER TABLE public.solution_oems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_technologies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for solution_oems
CREATE POLICY "Users can view solution oems in their tenant"
ON public.solution_oems FOR SELECT
USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create solution oems"
ON public.solution_oems FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers can update solution oems"
ON public.solution_oems FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete solution oems"
ON public.solution_oems FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for solution_technologies
CREATE POLICY "Users can view solution technologies in their tenant"
ON public.solution_technologies FOR SELECT
USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create solution technologies"
ON public.solution_technologies FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers can update solution technologies"
ON public.solution_technologies FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete solution technologies"
ON public.solution_technologies FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));