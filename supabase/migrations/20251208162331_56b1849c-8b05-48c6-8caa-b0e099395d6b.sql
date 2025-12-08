-- Add alliance_organization_id to deals table to link with Alliance organizations
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS alliance_organization_id UUID REFERENCES public.alliance_organizations(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_deals_alliance_organization ON public.deals(alliance_organization_id);

-- Add requirement_category to categorize the type of requirement
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS requirement_category TEXT;