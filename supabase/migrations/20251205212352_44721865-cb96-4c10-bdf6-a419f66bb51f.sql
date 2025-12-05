-- Create teams enum
CREATE TYPE public.team_type AS ENUM (
  'sales',
  'presales',
  'technical',
  'managed_services',
  'management',
  'hr',
  'finance',
  'inside_sales',
  'marketing'
);

-- Create user_teams table for many-to-many relationship
CREATE TABLE public.user_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team team_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, team)
);

-- Enable RLS
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

-- Users can view their own teams
CREATE POLICY "Users can view their own teams"
ON public.user_teams
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can assign teams
CREATE POLICY "Only admins can insert teams"
ON public.user_teams
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update teams
CREATE POLICY "Only admins can update teams"
ON public.user_teams
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete teams
CREATE POLICY "Only admins can delete teams"
ON public.user_teams
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if user belongs to a team
CREATE OR REPLACE FUNCTION public.has_team(_user_id uuid, _team team_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_teams
    WHERE user_id = _user_id
      AND team = _team
  )
$$;

-- Function to check if user belongs to any of the specified teams
CREATE OR REPLACE FUNCTION public.has_any_team(_user_id uuid, _teams team_type[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_teams
    WHERE user_id = _user_id
      AND team = ANY(_teams)
  )
$$;

-- Function to check if user is in management team (has access to all)
CREATE OR REPLACE FUNCTION public.is_management(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_teams
    WHERE user_id = _user_id
      AND team = 'management'
  )
$$;

-- Function to check if user has sales portal access
CREATE OR REPLACE FUNCTION public.has_sales_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_teams
    WHERE user_id = _user_id
      AND team IN ('sales', 'presales', 'inside_sales', 'management')
  ) OR has_role(_user_id, 'admin'::app_role)
$$;