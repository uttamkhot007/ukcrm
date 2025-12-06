-- Add currency column to quotations table for per-quote currency selection
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

-- Update existing quotations to use INR as default
UPDATE public.quotations SET currency = 'INR' WHERE currency IS NULL;