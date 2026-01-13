-- Add detailed MEDDIC fields to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS meddic_details jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS customer_environment jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS meddic_current_stage text DEFAULT 'metrics';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deals_meddic_current_stage ON public.deals(meddic_current_stage);

COMMENT ON COLUMN public.deals.meddic_details IS 'Detailed MEDDIC responses with sub-questions for each stage';
COMMENT ON COLUMN public.deals.customer_environment IS 'Customer infrastructure, existing solutions, and environment details';
COMMENT ON COLUMN public.deals.meddic_current_stage IS 'Current stage in MEDDIC wizard progression';