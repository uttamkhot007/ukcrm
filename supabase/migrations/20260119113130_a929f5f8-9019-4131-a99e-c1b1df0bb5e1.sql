-- Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-logos',
  'tenant-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their tenant's folder
CREATE POLICY "Authenticated users can upload tenant logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to tenant logos
CREATE POLICY "Public can view tenant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-logos');

-- Allow authenticated users to update their tenant logos
CREATE POLICY "Authenticated users can update tenant logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tenant-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their tenant logos
CREATE POLICY "Authenticated users can delete tenant logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'tenant-logos' AND auth.role() = 'authenticated');