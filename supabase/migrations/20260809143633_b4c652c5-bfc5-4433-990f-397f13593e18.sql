-- 1. organization_settings
DROP POLICY IF EXISTS "Everyone can view org settings" ON public.organization_settings;
CREATE POLICY "Tenant members can view org settings"
ON public.organization_settings FOR SELECT TO authenticated
USING (public.user_has_tenant_access(auth.uid(), tenant_id));

-- 2. vendors
DROP POLICY IF EXISTS "Everyone can view vendors" ON public.vendors;
CREATE POLICY "Tenant members can view vendors"
ON public.vendors FOR SELECT TO authenticated
USING (public.user_has_tenant_access(auth.uid(), tenant_id));

-- 3. quotation_items
DROP POLICY IF EXISTS "Users can view quotation items" ON public.quotation_items;

-- 4. profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Tenant members can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_platform_admin(auth.uid())
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
);

-- 5. tickets
DROP POLICY IF EXISTS "Users can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Customers can view their own tickets" ON public.tickets;
CREATE POLICY "Tenant scoped ticket read"
ON public.tickets FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (
    public.is_employee_user(auth.uid())
    AND tenant_id IS NOT NULL
    AND public.user_has_tenant_access(auth.uid(), tenant_id)
  )
);

-- 6. misc catalog/config tables: tenant scoping (global rows with NULL tenant stay shared)
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.product_catalog;
CREATE POLICY "Tenant members can view products" ON public.product_catalog FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view email templates" ON public.email_templates;
CREATE POLICY "Tenant members can view email templates" ON public.email_templates FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view landing pages" ON public.landing_pages;
CREATE POLICY "Tenant members can view landing pages" ON public.landing_pages FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view marketing journeys" ON public.marketing_journeys;
CREATE POLICY "Tenant members can view marketing journeys" ON public.marketing_journeys FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view territories" ON public.sales_territories;
CREATE POLICY "Tenant members can view territories" ON public.sales_territories FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view territory assignments" ON public.territory_assignments;
CREATE POLICY "Tenant members can view territory assignments" ON public.territory_assignments FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.sales_territories t
    WHERE t.id = territory_assignments.territory_id
      AND (t.tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), t.tenant_id))
  )
);

DROP POLICY IF EXISTS "Authenticated users can view leave policies" ON public.leave_policies;
CREATE POLICY "Tenant members can view leave policies" ON public.leave_policies FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view checklists" ON public.hr_checklists;
CREATE POLICY "Tenant members can view checklists" ON public.hr_checklists FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view job postings" ON public.job_postings;
CREATE POLICY "Tenant members can view job postings" ON public.job_postings FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view lifecycle stages" ON public.contact_lifecycle_stages;
CREATE POLICY "Tenant members can view lifecycle stages" ON public.contact_lifecycle_stages FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Authenticated users can view rotten deal settings" ON public.rotten_deal_settings;
CREATE POLICY "Tenant members can view rotten deal settings" ON public.rotten_deal_settings FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

-- 7. Storage: tenant-scoped ownership for shared branding buckets
DROP POLICY IF EXISTS "Allow authenticated users to delete organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tenant logos" ON storage.objects;

CREATE POLICY "Tenant folder upload branding assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('organization-assets','tenant-logos')
  AND (
    public.is_platform_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT tm.tenant_id::text FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Tenant folder update branding assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('organization-assets','tenant-logos')
  AND (
    public.is_platform_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT tm.tenant_id::text FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Tenant folder delete branding assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('organization-assets','tenant-logos')
  AND (
    public.is_platform_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT tm.tenant_id::text FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);

-- 8. Revoke direct execution of SECURITY DEFINER routines not needed by clients
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_messages() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_contact_to_alliance_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_inventory_quantity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_renewal_from_closed_won() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_job_application_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_events() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_create_order_processing_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notification_preferences() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_ledger_balance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_expense_report_total() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_by() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_request_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_stock_quantity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_day_book_entry() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_alliance_user_to_contacts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_prospect_from_closed_lost() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_deal_stage_change() FROM anon, authenticated;