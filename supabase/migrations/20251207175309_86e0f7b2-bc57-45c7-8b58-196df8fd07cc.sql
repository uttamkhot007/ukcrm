-- Add organization_type, logo_url, and address to alliance_organizations
ALTER TABLE public.alliance_organizations 
ADD COLUMN IF NOT EXISTS organization_type text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS address text;

-- Add oem_brand_name to distributors
ALTER TABLE public.distributors 
ADD COLUMN IF NOT EXISTS oem_brand_name text;

-- Add solutions and services columns to alliance_organizations for OEM type
ALTER TABLE public.alliance_organizations 
ADD COLUMN IF NOT EXISTS solutions text[],
ADD COLUMN IF NOT EXISTS services text[];