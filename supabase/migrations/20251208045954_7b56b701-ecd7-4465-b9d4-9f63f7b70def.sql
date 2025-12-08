-- Add management_team and core_team columns to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS management_team JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS core_team JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for organization assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for organization assets
CREATE POLICY "Allow authenticated users to upload organization assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to organization assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-assets');

CREATE POLICY "Allow authenticated users to update organization assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete organization assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');