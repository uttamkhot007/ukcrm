-- Create enum for POC status
CREATE TYPE public.poc_status AS ENUM ('requested', 'planning', 'in_progress', 'completed', 'cancelled', 'converted');

-- Create enum for demo status
CREATE TYPE public.demo_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show');

-- Create table for POC requests
CREATE TABLE public.poc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL,
  assigned_to UUID,
  status poc_status NOT NULL DEFAULT 'requested',
  priority TEXT DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  success_criteria TEXT,
  technical_requirements TEXT,
  infrastructure_notes TEXT,
  outcome TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for demo schedules
CREATE TABLE public.demo_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  scheduled_by UUID NOT NULL,
  presenter_id UUID,
  status demo_status NOT NULL DEFAULT 'scheduled',
  demo_type TEXT DEFAULT 'product',
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT,
  attendees TEXT[],
  notes TEXT,
  feedback TEXT,
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for technical assessments
CREATE TABLE public.technical_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  assessed_by UUID NOT NULL,
  status TEXT DEFAULT 'draft',
  current_environment TEXT,
  requirements TEXT,
  integration_points TEXT,
  security_requirements TEXT,
  scalability_needs TEXT,
  timeline TEXT,
  budget_range TEXT,
  risks TEXT,
  recommendations TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for RFP/RFI responses
CREATE TABLE public.rfp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  rfp_number TEXT,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL,
  status TEXT DEFAULT 'draft',
  due_date DATE,
  submitted_date DATE,
  response_document_url TEXT,
  sections_completed INTEGER DEFAULT 0,
  total_sections INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.poc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_responses ENABLE ROW LEVEL SECURITY;

-- POC Requests policies
CREATE POLICY "Users can view all POC requests"
ON public.poc_requests FOR SELECT
USING (true);

CREATE POLICY "Users can create POC requests"
ON public.poc_requests FOR INSERT
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can update POC requests"
ON public.poc_requests FOR UPDATE
USING (auth.uid() = requested_by OR auth.uid() = assigned_to OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete POC requests"
ON public.poc_requests FOR DELETE
USING (auth.uid() = requested_by OR has_role(auth.uid(), 'admin'));

-- Demo Schedules policies
CREATE POLICY "Users can view all demos"
ON public.demo_schedules FOR SELECT
USING (true);

CREATE POLICY "Users can create demos"
ON public.demo_schedules FOR INSERT
WITH CHECK (auth.uid() = scheduled_by);

CREATE POLICY "Users can update demos"
ON public.demo_schedules FOR UPDATE
USING (auth.uid() = scheduled_by OR auth.uid() = presenter_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can delete demos"
ON public.demo_schedules FOR DELETE
USING (auth.uid() = scheduled_by OR has_role(auth.uid(), 'admin'));

-- Technical Assessments policies
CREATE POLICY "Users can view all assessments"
ON public.technical_assessments FOR SELECT
USING (true);

CREATE POLICY "Users can create assessments"
ON public.technical_assessments FOR INSERT
WITH CHECK (auth.uid() = assessed_by);

CREATE POLICY "Users can update assessments"
ON public.technical_assessments FOR UPDATE
USING (auth.uid() = assessed_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete assessments"
ON public.technical_assessments FOR DELETE
USING (auth.uid() = assessed_by OR has_role(auth.uid(), 'admin'));

-- RFP Responses policies
CREATE POLICY "Users can view all RFP responses"
ON public.rfp_responses FOR SELECT
USING (true);

CREATE POLICY "Users can create RFP responses"
ON public.rfp_responses FOR INSERT
WITH CHECK (auth.uid() = assigned_to);

CREATE POLICY "Users can update RFP responses"
ON public.rfp_responses FOR UPDATE
USING (auth.uid() = assigned_to OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete RFP responses"
ON public.rfp_responses FOR DELETE
USING (auth.uid() = assigned_to OR has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_poc_requests_updated_at
BEFORE UPDATE ON public.poc_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demo_schedules_updated_at
BEFORE UPDATE ON public.demo_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_assessments_updated_at
BEFORE UPDATE ON public.technical_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rfp_responses_updated_at
BEFORE UPDATE ON public.rfp_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();