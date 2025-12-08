-- Add category column to organization_support_solutions
ALTER TABLE public.organization_support_solutions 
ADD COLUMN IF NOT EXISTS category TEXT;