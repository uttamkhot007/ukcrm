-- Create sales_teams table to store team info with leaders
CREATE TABLE public.sales_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  leader_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_teams ENABLE ROW LEVEL SECURITY;

-- Everyone can view sales teams
CREATE POLICY "Everyone can view sales teams"
ON public.sales_teams FOR SELECT
USING (true);

-- Only admins can manage sales teams
CREATE POLICY "Admins can manage sales teams"
ON public.sales_teams FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default sales teams
INSERT INTO public.sales_teams (team_code, name, description) VALUES
  ('commercial', 'Commercial', 'Commercial sales team'),
  ('enterprise_govt', 'Enterprise & Gov', 'Enterprise and Government sales team'),
  ('bfsi', 'BFSI', 'Banking, Financial Services and Insurance sales team'),
  ('international', 'International', 'International sales team'),
  ('alliance_india', 'Alliance India', 'Alliance India sales team');

-- Create sales_team_members junction table
CREATE TABLE public.sales_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.sales_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_leader boolean DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.sales_team_members ENABLE ROW LEVEL SECURITY;

-- Everyone can view team members
CREATE POLICY "Everyone can view team members"
ON public.sales_team_members FOR SELECT
USING (true);

-- Admins and managers can manage team members
CREATE POLICY "Admins can manage team members"
ON public.sales_team_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));