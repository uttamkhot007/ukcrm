-- Create centralized support SLAs table
CREATE TABLE IF NOT EXISTS public.support_slas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  response_hours INTEGER NOT NULL,
  resolution_hours INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create centralized escalation matrix templates
CREATE TABLE IF NOT EXISTS public.escalation_matrix_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  level_1_email TEXT,
  level_1_response_hours INTEGER DEFAULT 4,
  level_2_email TEXT,
  level_2_response_hours INTEGER DEFAULT 8,
  level_3_email TEXT,
  level_3_response_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create centralized support types (global)
CREATE TABLE IF NOT EXISTS public.support_type_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('one_time', 'yearly')),
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'custom')),
  description TEXT,
  response_hours INTEGER,
  resolution_hours INTEGER,
  price NUMERIC,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to organization_support_solutions for support type
ALTER TABLE public.organization_support_solutions 
ADD COLUMN IF NOT EXISTS support_type TEXT DEFAULT 'one_time' CHECK (support_type IN ('one_time', 'continuous')),
ADD COLUMN IF NOT EXISTS support_period_start DATE,
ADD COLUMN IF NOT EXISTS support_period_end DATE,
ADD COLUMN IF NOT EXISTS support_tier TEXT CHECK (support_tier IN ('bronze', 'silver', 'gold', 'diamond', 'custom')),
ADD COLUMN IF NOT EXISTS escalation_matrix_id UUID REFERENCES public.escalation_matrix_templates(id);

-- Enable RLS on new tables
ALTER TABLE public.support_slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_matrix_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_type_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_slas
CREATE POLICY "Users can view support SLAs in their tenant"
  ON public.support_slas FOR SELECT
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage support SLAs"
  ON public.support_slas FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS policies for escalation_matrix_templates
CREATE POLICY "Users can view escalation templates in their tenant"
  ON public.escalation_matrix_templates FOR SELECT
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage escalation templates"
  ON public.escalation_matrix_templates FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS policies for support_type_templates
CREATE POLICY "Users can view support type templates in their tenant"
  ON public.support_type_templates FOR SELECT
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage support type templates"
  ON public.support_type_templates FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));