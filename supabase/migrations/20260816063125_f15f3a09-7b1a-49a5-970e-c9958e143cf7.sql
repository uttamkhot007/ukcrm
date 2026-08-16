-- Full purge of Managed Security & Offensive Security delivery modules (database layer)

-- 1. Remove MSS/VAPT quotation templates from the document library
DELETE FROM public.document_template_versions
WHERE template_id IN (
  SELECT id FROM public.document_templates
  WHERE library_key IN ('quote-managed-security', 'quote-offensive-security')
);

DELETE FROM public.document_templates
WHERE library_key IN ('quote-managed-security', 'quote-offensive-security');

-- 2. Remove problem-area mappings for the security offering types
DELETE FROM public.offering_problem_area_mappings
WHERE offering_type IN ('offensive_security', 'managed_security');

-- 3. Drop the security offerings tables (they only reference tenants via tenant_id)
DROP TABLE IF EXISTS public.offerings_managed_security CASCADE;
DROP TABLE IF EXISTS public.offerings_offensive_security CASCADE;

-- 4. Remap any existing mss/offensive team assignments to technical
UPDATE public.user_teams
SET team = 'technical'
WHERE team IN ('mss', 'offensive');

-- 5. team_type enum values 'mss' and 'offensive' are intentionally left in place.
--    Postgres does not support dropping enum values when dependent functions/policies exist,
--    and 38 RLS policies plus helper functions reference the team_type enum. The application
--    layer is updated to stop assigning or checking these values, so they are effectively dead.
