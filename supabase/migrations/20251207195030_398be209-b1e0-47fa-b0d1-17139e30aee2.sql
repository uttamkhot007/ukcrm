-- Add comprehensive organization fields for enterprise profile
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS company_type text, -- Public, Private, Non-Profit, Government
ADD COLUMN IF NOT EXISTS founded_year integer,
ADD COLUMN IF NOT EXISTS annual_revenue text,
ADD COLUMN IF NOT EXISTS revenue_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS hq_city text,
ADD COLUMN IF NOT EXISTS hq_state text,
ADD COLUMN IF NOT EXISTS hq_country text,
ADD COLUMN IF NOT EXISTS postal_code text,

-- Email Security
ADD COLUMN IF NOT EXISTS spf_status text, -- pass, fail, unknown
ADD COLUMN IF NOT EXISTS dmarc_status text, -- pass, fail, unknown
ADD COLUMN IF NOT EXISTS dkim_status text, -- pass, fail, unknown
ADD COLUMN IF NOT EXISTS email_security_last_checked timestamp with time zone,

-- Account Management
ADD COLUMN IF NOT EXISTS account_manager_id uuid,
ADD COLUMN IF NOT EXISTS account_manager_name text,
ADD COLUMN IF NOT EXISTS account_manager_email text,
ADD COLUMN IF NOT EXISTS account_manager_phone text,
ADD COLUMN IF NOT EXISTS contract_start_date date,
ADD COLUMN IF NOT EXISTS contract_end_date date,
ADD COLUMN IF NOT EXISTS customer_since date,

-- Infrastructure Details
ADD COLUMN IF NOT EXISTS num_branches integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_systems integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_endpoints integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_servers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_users integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS datacenter_type text, -- on-prem, cloud, hybrid
ADD COLUMN IF NOT EXISTS cloud_providers text[], -- AWS, Azure, GCP, Other
ADD COLUMN IF NOT EXISTS on_prem_locations text[],

-- Security Tools & Controls
ADD COLUMN IF NOT EXISTS existing_security_tools jsonb DEFAULT '[]'::jsonb, -- [{name, category, vendor}]
ADD COLUMN IF NOT EXISTS security_controls text[], -- List of implemented controls
ADD COLUMN IF NOT EXISTS compliance_frameworks text[], -- ISO27001, SOC2, GDPR, etc.
ADD COLUMN IF NOT EXISTS security_certifications text[],
ADD COLUMN IF NOT EXISTS last_security_audit date,
ADD COLUMN IF NOT EXISTS next_security_audit date,

-- Additional Enterprise Fields
ADD COLUMN IF NOT EXISTS stock_symbol text,
ADD COLUMN IF NOT EXISTS stock_exchange text,
ADD COLUMN IF NOT EXISTS parent_company text,
ADD COLUMN IF NOT EXISTS subsidiaries text[],
ADD COLUMN IF NOT EXISTS technologies_used text[],
ADD COLUMN IF NOT EXISTS enrichment_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone;