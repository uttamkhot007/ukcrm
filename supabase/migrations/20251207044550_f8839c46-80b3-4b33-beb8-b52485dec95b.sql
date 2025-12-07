-- Add stage_completed_at to track when each stage was completed
-- This ensures stages cannot be bypassed

-- Create workflow_stage_completions table to track stage completions
CREATE TABLE public.workflow_stage_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.hr_workflows(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  notes TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_stage_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view stage completions" 
ON public.workflow_stage_completions 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and managers can manage stage completions" 
ON public.workflow_stage_completions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add source tracking to hr_workflows to know where workflow originated
ALTER TABLE public.hr_workflows 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_request_id UUID;

-- Create index for better performance
CREATE INDEX idx_workflow_stage_completions_workflow ON public.workflow_stage_completions(workflow_id);
CREATE INDEX idx_hr_workflows_source ON public.hr_workflows(source_type, source_request_id);