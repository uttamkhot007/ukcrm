-- Add lead scoring fields to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_scored_at timestamp with time zone;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_insights text;

-- Add AI insights fields to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS win_probability integer DEFAULT 50;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS ai_recommendations text[];
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS next_best_actions text[];
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS risk_factors text[];
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS last_analyzed_at timestamp with time zone;

-- Create sales forecasts table
CREATE TABLE IF NOT EXISTS public.sales_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  forecast_period text NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start date NOT NULL,
  period_end date NOT NULL,
  predicted_revenue numeric DEFAULT 0,
  weighted_pipeline numeric DEFAULT 0,
  confidence_score integer DEFAULT 0,
  ai_analysis text,
  factors jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email sequences table
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft',
  trigger_type text DEFAULT 'manual', -- 'manual', 'lead_created', 'deal_stage_change'
  trigger_conditions jsonb DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email sequence steps
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id uuid REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  delay_days integer DEFAULT 0,
  delay_hours integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email sequence enrollments
CREATE TABLE IF NOT EXISTS public.email_sequence_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id uuid REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id),
  lead_id uuid REFERENCES public.leads(id),
  deal_id uuid REFERENCES public.deals(id),
  current_step integer DEFAULT 1,
  status text DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  enrolled_by uuid NOT NULL
);

-- Create workflow automations table
CREATE TABLE IF NOT EXISTS public.sales_automations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- 'lead_created', 'deal_stage_change', 'activity_logged', 'score_threshold'
  trigger_conditions jsonb DEFAULT '{}',
  actions jsonb DEFAULT '[]',
  is_active boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_forecasts
CREATE POLICY "Users can view their own forecasts" ON public.sales_forecasts FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can create their own forecasts" ON public.sales_forecasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own forecasts" ON public.sales_forecasts FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for email_sequences
CREATE POLICY "Users can view email sequences" ON public.email_sequences FOR SELECT USING (public.has_sales_access(auth.uid()));
CREATE POLICY "Users can create email sequences" ON public.email_sequences FOR INSERT WITH CHECK (public.has_sales_access(auth.uid()));
CREATE POLICY "Users can update email sequences" ON public.email_sequences FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete email sequences" ON public.email_sequences FOR DELETE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for email_sequence_steps
CREATE POLICY "Users can manage sequence steps" ON public.email_sequence_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM public.email_sequences WHERE id = sequence_id AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- RLS Policies for email_sequence_enrollments
CREATE POLICY "Users can view enrollments" ON public.email_sequence_enrollments FOR SELECT USING (public.has_sales_access(auth.uid()));
CREATE POLICY "Users can create enrollments" ON public.email_sequence_enrollments FOR INSERT WITH CHECK (public.has_sales_access(auth.uid()));
CREATE POLICY "Users can update enrollments" ON public.email_sequence_enrollments FOR UPDATE USING (auth.uid() = enrolled_by OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sales_automations
CREATE POLICY "Users can view automations" ON public.sales_automations FOR SELECT USING (public.has_sales_access(auth.uid()));
CREATE POLICY "Users can create automations" ON public.sales_automations FOR INSERT WITH CHECK (public.has_sales_access(auth.uid()));
CREATE POLICY "Users can update automations" ON public.sales_automations FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete automations" ON public.sales_automations FOR DELETE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));