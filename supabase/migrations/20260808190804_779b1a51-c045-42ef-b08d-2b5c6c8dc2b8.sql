-- 1. Security definer view
ALTER VIEW public.profiles_safe SET (security_invoker = on);

-- 2. Mutable search_path
ALTER FUNCTION public.cleanup_expired_messages() SET search_path = public;
ALTER FUNCTION public.generate_quotation_number() SET search_path = public;

-- 3. Function EXECUTE privileges
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
DO $$
DECLARE r record;
DECLARE keep text[] := ARRAY['has_role','has_team','has_any_team','has_sales_access','is_customer','is_employee_user','is_management','is_platform_admin','is_super_admin','current_user_is_super_admin','is_tenant_admin','is_tenant_member','user_has_tenant_access','get_user_role','get_user_tenant_id','tenant_has_module','can_view_sales_record','should_hide_user_from_admins'];
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef LOOP
    IF NOT (r.proname = ANY(keep)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

-- 4. invoice_items
DROP POLICY IF EXISTS "Users can manage invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_items;
CREATE POLICY "Tenant users can manage invoice items"
ON public.invoice_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.user_has_tenant_access(auth.uid(), i.tenant_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.user_has_tenant_access(auth.uid(), i.tenant_id)));

-- 5. quotation_items
DROP POLICY IF EXISTS "Users can manage quotation items" ON public.quotation_items;
CREATE POLICY "Tenant users can manage quotation items"
ON public.quotation_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_items.quotation_id AND public.user_has_tenant_access(auth.uid(), q.tenant_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_items.quotation_id AND public.user_has_tenant_access(auth.uid(), q.tenant_id)));

-- 6. payment_records
DROP POLICY IF EXISTS "Users can view payments" ON public.payment_records;
DROP POLICY IF EXISTS "Users can record payments" ON public.payment_records;
CREATE POLICY "Tenant users can view payments"
ON public.payment_records FOR SELECT TO authenticated
USING (recorded_by = auth.uid() OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = payment_records.invoice_id AND public.user_has_tenant_access(auth.uid(), i.tenant_id)));
CREATE POLICY "Users can record payments"
ON public.payment_records FOR INSERT TO authenticated
WITH CHECK (recorded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = payment_records.invoice_id AND public.user_has_tenant_access(auth.uid(), i.tenant_id)));

-- 7. tenant_invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Tenant admins can manage invitations" ON public.tenant_invitations;
CREATE POLICY "Invited user or tenant admins can view invitations"
ON public.tenant_invitations FOR SELECT TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) OR public.is_tenant_admin(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant admins can manage invitations"
ON public.tenant_invitations FOR ALL TO authenticated
USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 8. compliance_controls
DROP POLICY IF EXISTS "Users can manage controls" ON public.compliance_controls;
DROP POLICY IF EXISTS "Users can view controls" ON public.compliance_controls;
CREATE POLICY "Tenant users can manage compliance controls"
ON public.compliance_controls FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.compliance_frameworks f WHERE f.id = compliance_controls.framework_id AND public.user_has_tenant_access(auth.uid(), f.tenant_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.compliance_frameworks f WHERE f.id = compliance_controls.framework_id AND public.user_has_tenant_access(auth.uid(), f.tenant_id)));

-- 9. approval_workflows
DROP POLICY IF EXISTS "System can manage approval workflows" ON public.approval_workflows;
DROP POLICY IF EXISTS "Users can view approval workflows" ON public.approval_workflows;
CREATE POLICY "Signed-in users can view approval workflows"
ON public.approval_workflows FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users can create approval workflows"
ON public.approval_workflows FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Approvers and admins can update approval workflows"
ON public.approval_workflows FOR UPDATE TO authenticated
USING (approver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (approver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete approval workflows"
ON public.approval_workflows FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 10. accounts_workflow_stage_completions
DROP POLICY IF EXISTS "Users can manage stage completions" ON public.accounts_workflow_stage_completions;
DROP POLICY IF EXISTS "Users can view stage completions" ON public.accounts_workflow_stage_completions;
CREATE POLICY "Tenant users can manage stage completions"
ON public.accounts_workflow_stage_completions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.accounts_workflows w WHERE w.id = accounts_workflow_stage_completions.workflow_id AND public.user_has_tenant_access(auth.uid(), w.tenant_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.accounts_workflows w WHERE w.id = accounts_workflow_stage_completions.workflow_id AND public.user_has_tenant_access(auth.uid(), w.tenant_id)));

-- 11. system insert policies
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Signed-in users can create notifications"
ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can create workflow logs" ON public.workflow_logs;
CREATE POLICY "Signed-in users can create workflow logs"
ON public.workflow_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can create stage history" ON public.workflow_stage_history;
CREATE POLICY "Signed-in users can create stage history"
ON public.workflow_stage_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert audit log" ON public.tenant_audit_log;
CREATE POLICY "Signed-in users can insert audit log"
ON public.tenant_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert exchange rates" ON public.exchange_rate_history;

-- 12. storage listing policies on public buckets
DROP POLICY IF EXISTS "Anyone can view SOP images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view tenant logos" ON storage.objects;
