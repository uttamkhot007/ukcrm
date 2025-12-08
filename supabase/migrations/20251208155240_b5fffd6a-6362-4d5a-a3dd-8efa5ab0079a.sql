-- Add AI enrichment columns to offerings_products
ALTER TABLE public.offerings_products 
ADD COLUMN IF NOT EXISTS ai_enriched_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unique_selling_points text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS awards text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS competitive_advantages text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS market_position text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone DEFAULT NULL;

-- Add AI enrichment columns to offerings_oems
ALTER TABLE public.offerings_oems 
ADD COLUMN IF NOT EXISTS ai_enriched_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS founded_year integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS headquarters text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS employee_count text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS market_cap text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS key_products text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone DEFAULT NULL;

-- Add AI enrichment columns to offerings_technologies
ALTER TABLE public.offerings_technologies 
ADD COLUMN IF NOT EXISTS ai_enriched_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS use_cases text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS limitations text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS adoption_rate text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS market_trends text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone DEFAULT NULL;