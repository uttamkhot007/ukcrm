-- Create enum for request types
CREATE TYPE public.request_type AS ENUM (
  'leave',
  'work_from_home',
  'advance_salary',
  'new_hardware',
  'hardware_problem',
  'other'
);

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'rejected',
  'completed',
  'cancelled'
);

-- Create enum for request priority
CREATE TYPE public.request_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create employee_requests table
CREATE TABLE public.employee_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  type request_type NOT NULL,
  priority request_priority NOT NULL DEFAULT 'medium',
  status request_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  
  -- Leave specific fields
  leave_start_date DATE,
  leave_end_date DATE,
  leave_type TEXT,
  
  -- WFH specific fields
  wfh_date DATE,
  wfh_reason TEXT,
  
  -- Salary advance fields
  advance_amount NUMERIC,
  advance_reason TEXT,
  
  -- Hardware fields
  hardware_type TEXT,
  hardware_description TEXT,
  
  -- SLA tracking
  assigned_to UUID,
  assigned_team TEXT,
  sla_hours INTEGER NOT NULL DEFAULT 24,
  sla_deadline TIMESTAMP WITH TIME ZONE,
  escalated BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0,
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_comments table for tracking communication
CREATE TABLE public.request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.employee_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_history table for audit trail
CREATE TABLE public.request_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.employee_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_status request_status,
  new_status request_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_requests
CREATE POLICY "Users can view their own requests"
ON public.employee_requests
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can create their own requests"
ON public.employee_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests"
ON public.employee_requests
FOR UPDATE
USING (
  (auth.uid() = user_id AND status = 'pending') 
  OR auth.uid() = assigned_to 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can delete their own pending requests"
ON public.employee_requests
FOR DELETE
USING ((auth.uid() = user_id AND status = 'pending') OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for request_comments
CREATE POLICY "Users can view comments on their requests"
ON public.request_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employee_requests 
    WHERE id = request_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

CREATE POLICY "Users can add comments to their requests"
ON public.request_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for request_history
CREATE POLICY "Users can view history of their requests"
ON public.request_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employee_requests 
    WHERE id = request_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

CREATE POLICY "System can insert history"
ON public.request_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to generate request number
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate request number
CREATE TRIGGER generate_request_number_trigger
BEFORE INSERT ON public.employee_requests
FOR EACH ROW
EXECUTE FUNCTION public.generate_request_number();

-- Function to set SLA deadline based on request type
CREATE OR REPLACE FUNCTION public.set_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Set SLA hours based on request type
  CASE NEW.type
    WHEN 'leave' THEN NEW.sla_hours := 24;
    WHEN 'work_from_home' THEN NEW.sla_hours := 8;
    WHEN 'advance_salary' THEN NEW.sla_hours := 48;
    WHEN 'new_hardware' THEN NEW.sla_hours := 72;
    WHEN 'hardware_problem' THEN NEW.sla_hours := 4;
    ELSE NEW.sla_hours := 24;
  END CASE;
  
  -- Set SLA deadline
  NEW.sla_deadline := NOW() + (NEW.sla_hours || ' hours')::INTERVAL;
  
  -- Set assigned team based on request type
  CASE NEW.type
    WHEN 'leave' THEN NEW.assigned_team := 'HR';
    WHEN 'work_from_home' THEN NEW.assigned_team := 'HR';
    WHEN 'advance_salary' THEN NEW.assigned_team := 'Finance';
    WHEN 'new_hardware' THEN NEW.assigned_team := 'IT';
    WHEN 'hardware_problem' THEN NEW.assigned_team := 'IT';
    ELSE NEW.assigned_team := 'Admin';
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to set SLA deadline on insert
CREATE TRIGGER set_sla_deadline_trigger
BEFORE INSERT ON public.employee_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_sla_deadline();

-- Trigger for updated_at
CREATE TRIGGER update_employee_requests_updated_at
BEFORE UPDATE ON public.employee_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();