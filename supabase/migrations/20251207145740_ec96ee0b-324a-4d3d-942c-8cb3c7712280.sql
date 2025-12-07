-- Create table for employee mood tracking on logout
CREATE TABLE public.employee_mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('interesting', 'boring', 'good', 'informative', 'stressful')),
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  session_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_mood_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own mood logs
CREATE POLICY "Users can log their own mood"
ON public.employee_mood_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own mood logs
CREATE POLICY "Users can view their own mood logs"
ON public.employee_mood_logs
FOR SELECT
USING (auth.uid() = user_id);

-- HR/Admin/Managers can view all mood logs for analytics
CREATE POLICY "HR and managers can view all mood logs"
ON public.employee_mood_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_team(auth.uid(), 'hr'::team_type)
);

-- Add emergency contact and address fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
ADD COLUMN IF NOT EXISTS current_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS avatar_style TEXT DEFAULT 'initials',
ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT '{}'::jsonb;

-- Create index for mood analytics queries
CREATE INDEX idx_employee_mood_logs_user_logged_at ON public.employee_mood_logs(user_id, logged_at);
CREATE INDEX idx_employee_mood_logs_logged_at ON public.employee_mood_logs(logged_at);