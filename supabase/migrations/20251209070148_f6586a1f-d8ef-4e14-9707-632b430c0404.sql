-- Add versioning and author fields to solution_documentation
ALTER TABLE public.solution_documentation
ADD COLUMN IF NOT EXISTS version_number VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;

-- Add comment for the columns
COMMENT ON COLUMN public.solution_documentation.version_number IS 'Document version number e.g. 1.0, 1.1, 2.0';
COMMENT ON COLUMN public.solution_documentation.prepared_by IS 'Name of person who prepared the document';
COMMENT ON COLUMN public.solution_documentation.reviewed_by IS 'Name of person who reviewed the document';
COMMENT ON COLUMN public.solution_documentation.approved_by IS 'Name of person who approved the document';
COMMENT ON COLUMN public.solution_documentation.revision_history IS 'Array of revision entries with version, date, author, changes';
COMMENT ON COLUMN public.solution_documentation.branding IS 'Branding settings including logo, colors, company info';