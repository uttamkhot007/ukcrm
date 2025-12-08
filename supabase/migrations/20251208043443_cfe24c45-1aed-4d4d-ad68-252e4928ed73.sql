-- Add new columns to contacts table for enhanced contact management
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES public.contacts(id),
ADD COLUMN IF NOT EXISTS role_in_deal TEXT CHECK (role_in_deal IN ('decision_maker', 'influencer', 'evaluator', 'champion', 'blocker', 'end_user', 'technical_buyer', 'economic_buyer')),
ADD COLUMN IF NOT EXISTS is_champion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS seniority_level TEXT CHECK (seniority_level IN ('c_level', 'vp', 'director', 'manager', 'individual_contributor', 'unknown')),
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_is_champion ON public.contacts(is_champion);
CREATE INDEX IF NOT EXISTS idx_contacts_role_in_deal ON public.contacts(role_in_deal);