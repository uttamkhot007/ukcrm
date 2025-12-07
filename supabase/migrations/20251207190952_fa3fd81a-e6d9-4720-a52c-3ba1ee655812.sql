-- Create table for Problem & Requirement Areas
CREATE TABLE public.offerings_problem_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  area_type TEXT DEFAULT 'problem',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create table for Technologies
CREATE TABLE public.offerings_technologies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  vendor TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create table for OEMs
CREATE TABLE public.offerings_oems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  partnership_level TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.offerings_problem_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings_oems ENABLE ROW LEVEL SECURITY;

-- RLS policies for offerings_problem_areas
CREATE POLICY "Users can view problem areas in their tenant" ON public.offerings_problem_areas
  FOR SELECT USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can create problem areas" ON public.offerings_problem_areas
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can update problem areas" ON public.offerings_problem_areas
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete problem areas" ON public.offerings_problem_areas
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for offerings_technologies
CREATE POLICY "Users can view technologies in their tenant" ON public.offerings_technologies
  FOR SELECT USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can create technologies" ON public.offerings_technologies
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can update technologies" ON public.offerings_technologies
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete technologies" ON public.offerings_technologies
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for offerings_oems
CREATE POLICY "Users can view OEMs in their tenant" ON public.offerings_oems
  FOR SELECT USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can create OEMs" ON public.offerings_oems
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can update OEMs" ON public.offerings_oems
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete OEMs" ON public.offerings_oems
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));