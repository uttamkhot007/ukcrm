-- Add attendance configuration fields to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS work_start_time time without time zone DEFAULT '09:00:00'::time,
ADD COLUMN IF NOT EXISTS late_threshold_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS work_end_time time without time zone DEFAULT '18:00:00'::time,
ADD COLUMN IF NOT EXISTS early_departure_threshold_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS late_arrival_alert_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS early_departure_alert_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_managers_on_late boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_managers_on_early_departure boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS consecutive_late_threshold integer DEFAULT 3;