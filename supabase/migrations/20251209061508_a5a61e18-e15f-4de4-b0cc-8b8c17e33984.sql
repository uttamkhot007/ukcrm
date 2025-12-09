-- Add AI enrichment columns to offerings_problem_areas
ALTER TABLE public.offerings_problem_areas
ADD COLUMN IF NOT EXISTS recommended_controls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS possible_impact text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attack_vectors text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS risk_level text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mitigation_strategies text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compliance_frameworks text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.offerings_problem_areas.recommended_controls IS 'AI-generated security controls to address this problem area';
COMMENT ON COLUMN public.offerings_problem_areas.possible_impact IS 'AI-generated description of potential business/security impact';
COMMENT ON COLUMN public.offerings_problem_areas.attack_vectors IS 'AI-generated list of possible attack vectors';
COMMENT ON COLUMN public.offerings_problem_areas.risk_level IS 'AI-assessed risk level (critical, high, medium, low)';
COMMENT ON COLUMN public.offerings_problem_areas.mitigation_strategies IS 'AI-generated mitigation strategies';
COMMENT ON COLUMN public.offerings_problem_areas.compliance_frameworks IS 'Related compliance frameworks (NIST, ISO, etc.)';