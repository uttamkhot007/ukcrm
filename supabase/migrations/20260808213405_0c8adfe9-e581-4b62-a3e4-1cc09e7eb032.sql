CREATE POLICY "Tenant members read generated document files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'generated-documents'
  AND (
    public.is_platform_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT tm.tenant_id::text FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Tenant members upload generated document files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'generated-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tm.tenant_id::text FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

CREATE POLICY "Tenant members update generated document files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'generated-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tm.tenant_id::text FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

CREATE POLICY "Tenant members delete generated document files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'generated-documents'
  AND (
    public.is_platform_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT tm.tenant_id::text FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);