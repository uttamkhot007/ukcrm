-- Add MEDDIC qualification fields to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS meddic_metrics TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS meddic_economic_buyer TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS meddic_decision_criteria TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS meddic_decision_process TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS meddic_identify_pain TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS meddic_champion TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS meddic_score INTEGER DEFAULT 0;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS qualification_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS auto_progression_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS last_stage_change_at TIMESTAMP WITH TIME ZONE;

-- Create a table for sales funnel workflow configurations
CREATE TABLE IF NOT EXISTS public.sales_funnel_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  stage_from TEXT NOT NULL,
  stage_to TEXT NOT NULL,
  required_fields JSONB DEFAULT '[]'::jsonb,
  required_meddic_score INTEGER DEFAULT 0,
  auto_progress BOOLEAN DEFAULT false,
  notify_on_progress BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_funnel_workflows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view sales funnel workflows in their tenant" 
ON public.sales_funnel_workflows 
FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can create sales funnel workflows" 
ON public.sales_funnel_workflows 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Managers can update sales funnel workflows" 
ON public.sales_funnel_workflows 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Create stage progression log for audit trail
CREATE TABLE IF NOT EXISTS public.deal_stage_progression_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  progression_type TEXT NOT NULL DEFAULT 'manual', -- 'auto' or 'manual'
  meddic_score_at_change INTEGER,
  triggered_by UUID,
  trigger_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_stage_progression_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for progression log
CREATE POLICY "Users can view their deal progression logs" 
ON public.deal_stage_progression_log 
FOR SELECT 
USING (
  deal_id IN (
    SELECT id FROM public.deals WHERE user_id = auth.uid() OR assigned_to = auth.uid()
  )
);

CREATE POLICY "Users can create progression logs for their deals" 
ON public.deal_stage_progression_log 
FOR INSERT 
WITH CHECK (
  deal_id IN (
    SELECT id FROM public.deals WHERE user_id = auth.uid() OR assigned_to = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deal_stage_progression_log_deal_id ON public.deal_stage_progression_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_meddic_score ON public.deals(meddic_score);