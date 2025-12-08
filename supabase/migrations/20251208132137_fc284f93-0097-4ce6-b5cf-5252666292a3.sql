-- Add social media and additional profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS github_url text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS responsibilities text[];

-- Create employee awards table
CREATE TABLE IF NOT EXISTS public.employee_awards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  awarded_date date,
  awarded_by text,
  category text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create employee certifications table
CREATE TABLE IF NOT EXISTS public.employee_certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create employee achievements table
CREATE TABLE IF NOT EXISTS public.employee_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  achieved_date date,
  category text,
  metric_value numeric,
  metric_unit text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_awards
CREATE POLICY "Users can view awards in their tenant" 
ON public.employee_awards FOR SELECT 
USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id) OR (user_id = auth.uid()));

CREATE POLICY "Admins can manage awards" 
ON public.employee_awards FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR (user_id = auth.uid()));

-- RLS policies for employee_certifications
CREATE POLICY "Users can view certifications in their tenant" 
ON public.employee_certifications FOR SELECT 
USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id) OR (user_id = auth.uid()));

CREATE POLICY "Users can manage their own certifications" 
ON public.employee_certifications FOR ALL 
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS policies for employee_achievements
CREATE POLICY "Users can view achievements in their tenant" 
ON public.employee_achievements FOR SELECT 
USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id) OR (user_id = auth.uid()));

CREATE POLICY "Admins can manage achievements" 
ON public.employee_achievements FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR (user_id = auth.uid()));