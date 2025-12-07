-- Add oem_id and technology_id to offerings_solutions
ALTER TABLE public.offerings_solutions 
ADD COLUMN oem_id uuid REFERENCES public.offerings_oems(id) ON DELETE SET NULL,
ADD COLUMN technology_id uuid REFERENCES public.offerings_technologies(id) ON DELETE SET NULL;

-- Create junction table for OEM-Technology relationships
CREATE TABLE public.oem_technologies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  oem_id uuid NOT NULL REFERENCES public.offerings_oems(id) ON DELETE CASCADE,
  technology_id uuid NOT NULL REFERENCES public.offerings_technologies(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(oem_id, technology_id)
);

-- Enable RLS
ALTER TABLE public.oem_technologies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oem_technologies
CREATE POLICY "Users can view oem technologies in their tenant"
ON public.oem_technologies FOR SELECT
USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create oem technologies"
ON public.oem_technologies FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers can update oem technologies"
ON public.oem_technologies FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete oem technologies"
ON public.oem_technologies FOR DELETE
USING (has_role(auth.uid(), 'admin'));