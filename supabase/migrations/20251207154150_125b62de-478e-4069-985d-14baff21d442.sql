
-- Create alliance_organizations table
CREATE TABLE public.alliance_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  industry TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create alliance_users table
CREATE TABLE public.alliance_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  organization_id UUID REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  role TEXT,
  escalation_manager_id UUID REFERENCES public.alliance_users(id),
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create offerings_solutions table
CREATE TABLE public.offerings_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create offerings_offensive_security table
CREATE TABLE public.offerings_offensive_security (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create offerings_managed_security table
CREATE TABLE public.offerings_managed_security (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create offerings_professional_services table
CREATE TABLE public.offerings_professional_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.alliance_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings_offensive_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings_managed_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings_professional_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for alliance_organizations
CREATE POLICY "Users can view alliance orgs in their tenant" ON public.alliance_organizations
  FOR SELECT USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can create alliance orgs" ON public.alliance_organizations
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update alliance orgs" ON public.alliance_organizations
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete alliance orgs" ON public.alliance_organizations
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS policies for alliance_users
CREATE POLICY "Users can view alliance users in their tenant" ON public.alliance_users
  FOR SELECT USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can create alliance users" ON public.alliance_users
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update alliance users" ON public.alliance_users
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete alliance users" ON public.alliance_users
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS policies for offerings tables (same pattern)
CREATE POLICY "Users can view solutions in their tenant" ON public.offerings_solutions
  FOR SELECT USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage solutions" ON public.offerings_solutions
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view offensive security in their tenant" ON public.offerings_offensive_security
  FOR SELECT USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage offensive security" ON public.offerings_offensive_security
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view managed security in their tenant" ON public.offerings_managed_security
  FOR SELECT USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage managed security" ON public.offerings_managed_security
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view professional services in their tenant" ON public.offerings_professional_services
  FOR SELECT USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage professional services" ON public.offerings_professional_services
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
