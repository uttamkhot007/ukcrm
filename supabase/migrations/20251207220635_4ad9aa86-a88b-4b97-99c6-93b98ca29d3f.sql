-- Add new columns to alliance_users for enriched data
ALTER TABLE public.alliance_users 
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS anniversary_date date,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS designation text;