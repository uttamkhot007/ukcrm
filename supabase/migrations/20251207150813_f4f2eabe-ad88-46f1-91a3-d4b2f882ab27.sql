-- Add tenant_id to attendance table for tenant isolation
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS mood_check_in text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS mood_check_out text;

-- Create activity definitions table (team-specific activities)
CREATE TABLE IF NOT EXISTS public.activity_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  name text NOT NULL,
  description text,
  team_type text, -- NULL means common activity for all teams
  department text, -- For department-specific activities
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, name, team_type, department)
);

-- Create activity logs table (time spent on each activity)
CREATE TABLE IF NOT EXISTS public.attendance_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid REFERENCES public.attendance(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES public.activity_definitions(id) NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  notes text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Update employee_mood_logs to link with attendance
ALTER TABLE public.employee_mood_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.employee_mood_logs ADD COLUMN IF NOT EXISTS attendance_id uuid REFERENCES public.attendance(id);
ALTER TABLE public.employee_mood_logs ADD COLUMN IF NOT EXISTS mood_type text DEFAULT 'check_out'; -- check_in or check_out

-- Enable RLS on new tables
ALTER TABLE public.activity_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_definitions
CREATE POLICY "Users can view activity definitions for their tenant"
  ON public.activity_definitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm 
      WHERE tm.tenant_id = activity_definitions.tenant_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage activity definitions"
  ON public.activity_definitions FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );

-- RLS policies for attendance_activities
CREATE POLICY "Users can view their own activities"
  ON public.attendance_activities FOR SELECT
  USING (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can create their own activities"
  ON public.attendance_activities FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities"
  ON public.attendance_activities FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete activities"
  ON public.attendance_activities FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Update attendance RLS to include tenant filtering
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can create their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;

CREATE POLICY "Users can view attendance in their tenant"
  ON public.attendance FOR SELECT
  USING (
    auth.uid() = user_id OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_members tm 
      WHERE tm.tenant_id = attendance.tenant_id 
      AND tm.user_id = auth.uid()
      AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
    ))
  );

CREATE POLICY "Users can create their own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
  ON public.attendance FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert default common activities for Vinca Cyber tenant
INSERT INTO public.activity_definitions (tenant_id, name, description, team_type, department) VALUES
  -- Common activities (team_type = NULL)
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Training to Peers', 'Conducting training sessions for team members', NULL, NULL),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Learning', 'Self-learning and skill development', NULL, NULL),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Meeting with Peers', 'Internal team meetings and discussions', NULL, NULL),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Documentation', 'Creating or updating documentation', NULL, NULL),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Administrative Work', 'General admin tasks', NULL, NULL),
  -- Sales specific activities
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Customer Meeting - Onsite', 'In-person customer meetings', 'sales', 'Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Customer Meeting - Remote', 'Virtual customer meetings', 'sales', 'Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Cold Calling', 'Outbound sales calls', 'sales', 'Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Proposal Preparation', 'Creating sales proposals', 'sales', 'Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Follow-up Calls', 'Following up with prospects', 'sales', 'Sales'),
  -- Pre-Sales specific activities
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Demo', 'Product demonstrations', 'presales', 'Pre-Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'POC', 'Proof of Concept work', 'presales', 'Pre-Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Technical Assessment', 'Evaluating technical requirements', 'presales', 'Presales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'RFP Response', 'Responding to RFPs', 'presales', 'Pre-Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Solution Design', 'Designing solutions for clients', 'presales', 'Pre-Sales'),
  -- Inside Sales specific
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Lead Qualification', 'Qualifying incoming leads', 'inside_sales', 'Inside Sales'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Email Outreach', 'Sending sales emails', 'inside_sales', 'Inside Sales'),
  -- Technical specific
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Implementation', 'Customer implementation work', 'technical', 'Technical'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Troubleshooting', 'Technical troubleshooting', 'technical', 'Technical'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Support', 'Customer support activities', 'technical', 'Technical'),
  -- HR specific
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Recruitment', 'Hiring activities', 'hr', 'HR'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Employee Engagement', 'Employee engagement activities', 'hr', 'HR'),
  -- Accounts specific
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Invoice Processing', 'Processing invoices', 'accounts', 'Accounts'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Payment Follow-up', 'Following up on payments', 'accounts', 'Accounts'),
  ('efa85094-f30c-4004-812c-890fd6e748af', 'Order Processing', 'Processing orders', 'accounts', 'Accounts')
ON CONFLICT (tenant_id, name, team_type, department) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_activities_attendance ON public.attendance_activities(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_activities_user ON public.attendance_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_activities_tenant ON public.attendance_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON public.attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_definitions_tenant ON public.activity_definitions(tenant_id);