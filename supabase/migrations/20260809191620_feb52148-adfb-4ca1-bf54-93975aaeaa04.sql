-- ============ STORAGE: tenant-scoped document access ============
DROP POLICY IF EXISTS "Users can view order documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload order documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete order documents" ON storage.objects;

CREATE POLICY "Tenant members can view order documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant members can upload order documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Tenant admins can delete order documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'order-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

DROP POLICY IF EXISTS "Users can view tender documents" ON storage.objects;
DROP POLICY IF EXISTS "Users with sales access can upload tender documents" ON storage.objects;
DROP POLICY IF EXISTS "Users with sales access can delete tender documents" ON storage.objects;

CREATE POLICY "Tenant members can view tender documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tender-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Sales can upload tender documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tender-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND public.has_sales_access(auth.uid())
);

CREATE POLICY "Sales can delete tender documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tender-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND public.has_sales_access(auth.uid())
);

DROP POLICY IF EXISTS "Users can view their tenant verification documents" ON storage.objects;
DROP POLICY IF EXISTS "HR/Admin can upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "HR/Admin can delete verification documents" ON storage.objects;

CREATE POLICY "Tenant members can view verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "HR can upload verification documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_team(auth.uid(), 'hr'::team_type)
    OR public.is_management(auth.uid())
    OR public.is_super_admin(auth.uid())
  )
);

CREATE POLICY "HR can delete verification documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_has_tenant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_team(auth.uid(), 'hr'::team_type)
    OR public.is_management(auth.uid())
    OR public.is_super_admin(auth.uid())
  )
);

-- ============ journey_enrollments ============
DROP POLICY IF EXISTS "Authenticated users can view journey enrollments" ON public.journey_enrollments;
CREATE POLICY "Tenant members can view journey enrollments"
ON public.journey_enrollments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_journeys mj
    WHERE mj.id = journey_enrollments.journey_id
      AND public.user_has_tenant_access(auth.uid(), mj.tenant_id)
  )
);

-- ============ event_wishes ============
DROP POLICY IF EXISTS "Everyone can view wishes" ON public.event_wishes;
CREATE POLICY "Tenant colleagues can view wishes"
ON public.event_wishes FOR SELECT TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.profiles them ON them.tenant_id = me.tenant_id
    WHERE me.user_id = auth.uid()
      AND me.tenant_id IS NOT NULL
      AND them.user_id = event_wishes.sender_id
  )
);

-- ============ deal_registrations insert ============
DROP POLICY IF EXISTS "Sales team can create deal registrations" ON public.deal_registrations;
CREATE POLICY "Sales team can create deal registrations"
ON public.deal_registrations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id IS NOT NULL
  AND public.user_has_tenant_access(auth.uid(), tenant_id)
);

-- ============ SECURITY DEFINER exposure ============
REVOKE EXECUTE ON FUNCTION public.can_view_sales_record(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_customer(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_management(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.should_hide_user_from_admins(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tenant_has_module(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_people_intelligence(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_team(uuid, team_type[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_sales_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_team(uuid, team_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_employee_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_tenant_access(uuid, uuid) FROM anon;