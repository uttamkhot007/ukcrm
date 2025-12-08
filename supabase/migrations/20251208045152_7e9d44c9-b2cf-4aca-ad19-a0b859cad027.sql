-- Add settings columns to alliance_organizations table
ALTER TABLE public.alliance_organizations 
ADD COLUMN IF NOT EXISTS account_manager_id UUID,
ADD COLUMN IF NOT EXISTS technical_account_manager_id UUID,
ADD COLUMN IF NOT EXISTS team_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS infrastructure_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS security_controls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS solution_configs JSONB DEFAULT '{}'::jsonb;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_alliance_organizations_account_manager ON public.alliance_organizations(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_alliance_organizations_tam ON public.alliance_organizations(technical_account_manager_id);