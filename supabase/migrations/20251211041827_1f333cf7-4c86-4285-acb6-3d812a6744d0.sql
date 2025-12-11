-- Add bank details columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_ifsc_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_branch text;

-- Add ESI details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS esi_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS esi_dispensary text;

-- Add PF details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pf_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uan_number text;

-- Add gratuity details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gratuity_nomination_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gratuity_nomination_relation text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gratuity_nomination_percentage numeric DEFAULT 100;