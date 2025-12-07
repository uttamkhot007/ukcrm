-- Create workflow type enum
CREATE TYPE public.hr_workflow_type AS ENUM ('onboarding', 'offboarding', 'retention');

-- Create workflow status enum
CREATE TYPE public.hr_workflow_status AS ENUM ('draft', 'active', 'pending_approval', 'approved', 'rejected', 'completed', 'cancelled');

-- Create workflow stage enum for onboarding
CREATE TYPE public.onboarding_stage AS ENUM (
  'requirement_submitted',
  'hr_sourcing',
  'profile_review',
  'manager_interview',
  'senior_interview',
  'ceo_interview',
  'management_interview',
  'offer_preparation',
  'offer_sent',
  'offer_accepted',
  'completed'
);

-- Create workflow stage enum for offboarding
CREATE TYPE public.offboarding_stage AS ENUM (
  'resignation_submitted',
  'manager_review',
  'retention_review',
  'exit_approved',
  'knowledge_transfer',
  'asset_return',
  'exit_interview',
  'final_settlement',
  'completed'
);

-- Create workflow settings table for configurable thresholds
CREATE TABLE public.workflow_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default salary thresholds
INSERT INTO public.workflow_settings (setting_key, setting_value) VALUES
('salary_thresholds', '{"ceo_interview_threshold": 1500000, "management_interview_threshold": 3000000}'::jsonb);

-- Create HR workflows master table
CREATE TABLE public.hr_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type hr_workflow_type NOT NULL,
  title text NOT NULL,
  description text,
  status hr_workflow_status NOT NULL DEFAULT 'draft',
  initiated_by uuid NOT NULL,
  assigned_to uuid,
  current_stage text NOT NULL,
  target_user_id uuid,
  priority request_priority NOT NULL DEFAULT 'medium',
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create onboarding requests table (new hire requirement form)
CREATE TABLE public.onboarding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.hr_workflows(id) ON DELETE CASCADE,
  requesting_manager_id uuid NOT NULL,
  job_title text NOT NULL,
  department text,
  location text,
  employment_type text DEFAULT 'full_time',
  salary_range_min numeric,
  salary_range_max numeric,
  expected_salary numeric,
  job_description text,
  requirements text,
  justification text,
  urgency text DEFAULT 'normal',
  expected_start_date date,
  reports_to uuid,
  headcount_approved boolean DEFAULT false,
  budget_approved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create candidate profiles table
CREATE TABLE public.workflow_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.hr_workflows(id) ON DELETE CASCADE,
  onboarding_request_id uuid REFERENCES public.onboarding_requests(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  email text,
  phone text,
  resume_url text,
  current_company text,
  current_designation text,
  experience_years numeric,
  expected_salary numeric,
  notice_period_days integer,
  skills text[],
  notes text,
  status text DEFAULT 'sourced',
  selected boolean DEFAULT false,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create interview records table
CREATE TABLE public.workflow_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.hr_workflows(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.workflow_candidates(id) ON DELETE CASCADE,
  interviewer_id uuid NOT NULL,
  interview_type text NOT NULL,
  interview_level integer DEFAULT 1,
  scheduled_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'scheduled',
  rating integer,
  feedback text,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create offer letters table
CREATE TABLE public.workflow_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.hr_workflows(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.workflow_candidates(id) ON DELETE CASCADE,
  offer_salary numeric NOT NULL,
  joining_date date,
  job_title text NOT NULL,
  department text,
  location text,
  benefits text,
  offer_letter_url text,
  status text DEFAULT 'draft',
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create resignation requests table
CREATE TABLE public.resignation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.hr_workflows(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  reason text,
  last_working_date date,
  notice_period_days integer DEFAULT 30,
  manager_action text,
  manager_notes text,
  retention_attempted boolean DEFAULT false,
  retention_outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create workflow stage history table
CREATE TABLE public.workflow_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.hr_workflows(id) ON DELETE CASCADE NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create workflow comments table
CREATE TABLE public.workflow_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.hr_workflows(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resignation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_settings
CREATE POLICY "Everyone can view workflow settings"
ON public.workflow_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can manage workflow settings"
ON public.workflow_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for hr_workflows
CREATE POLICY "Users can view relevant workflows"
ON public.hr_workflows FOR SELECT
USING (
  initiated_by = auth.uid() OR 
  assigned_to = auth.uid() OR 
  target_user_id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Users can create workflows"
ON public.hr_workflows FOR INSERT
WITH CHECK (initiated_by = auth.uid());

CREATE POLICY "Admins and managers can update workflows"
ON public.hr_workflows FOR UPDATE
USING (
  initiated_by = auth.uid() OR 
  assigned_to = auth.uid() OR
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete workflows"
ON public.hr_workflows FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for onboarding_requests
CREATE POLICY "Users can view onboarding requests"
ON public.onboarding_requests FOR SELECT USING (
  requesting_manager_id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Users can create onboarding requests"
ON public.onboarding_requests FOR INSERT
WITH CHECK (requesting_manager_id = auth.uid());

CREATE POLICY "Admins and managers can update onboarding requests"
ON public.onboarding_requests FOR UPDATE
USING (
  requesting_manager_id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

-- RLS Policies for workflow_candidates
CREATE POLICY "Admins and managers can view candidates"
ON public.workflow_candidates FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can manage candidates"
ON public.workflow_candidates FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for workflow_interviews
CREATE POLICY "Users can view their interviews"
ON public.workflow_interviews FOR SELECT
USING (
  interviewer_id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can manage interviews"
ON public.workflow_interviews FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for workflow_offers
CREATE POLICY "Admins and managers can view offers"
ON public.workflow_offers FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can manage offers"
ON public.workflow_offers FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for resignation_requests
CREATE POLICY "Users can view their resignation requests"
ON public.resignation_requests FOR SELECT
USING (
  employee_id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Users can create their resignation"
ON public.resignation_requests FOR INSERT
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins and managers can update resignations"
ON public.resignation_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for workflow_stage_history
CREATE POLICY "Users can view stage history"
ON public.workflow_stage_history FOR SELECT USING (true);

CREATE POLICY "System can create stage history"
ON public.workflow_stage_history FOR INSERT WITH CHECK (true);

-- RLS Policies for workflow_comments
CREATE POLICY "Users can view workflow comments"
ON public.workflow_comments FOR SELECT USING (true);

CREATE POLICY "Users can create comments"
ON public.workflow_comments FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create updated_at triggers
CREATE TRIGGER update_hr_workflows_updated_at
BEFORE UPDATE ON public.hr_workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_requests_updated_at
BEFORE UPDATE ON public.onboarding_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_candidates_updated_at
BEFORE UPDATE ON public.workflow_candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_interviews_updated_at
BEFORE UPDATE ON public.workflow_interviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_offers_updated_at
BEFORE UPDATE ON public.workflow_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resignation_requests_updated_at
BEFORE UPDATE ON public.resignation_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_settings_updated_at
BEFORE UPDATE ON public.workflow_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for workflows
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_stage_history;