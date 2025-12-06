-- Add alternate currency column to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS alternate_currency TEXT DEFAULT 'USD';