-- 1. Tenant-scope every privilege-based policy that lacks a tenant check
DO $do$
DECLARE r record; newq text; newwc text; roles text;
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname, p.cmd, p.qual, p.with_check, p.roles
    FROM pg_policies p
    WHERE p.schemaname='public'
      AND EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema='public' AND c.table_name=p.tablename AND c.column_name='tenant_id')
      AND (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~ '(has_role\(|has_team\(|has_any_team\()'
      AND (coalesce(p.qual,'')||coalesce(p.with_check,'')) NOT LIKE '%user_has_tenant_access%'
  LOOP
    newq := CASE WHEN r.qual IS NULL THEN NULL ELSE '('||r.qual||') AND public.user_has_tenant_access(auth.uid(), tenant_id)' END;
    newwc := CASE WHEN r.with_check IS NULL THEN NULL ELSE '('||r.with_check||') AND public.user_has_tenant_access(auth.uid(), tenant_id)' END;
    roles := array_to_string(r.roles, ',');
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO %s %s %s',
      r.policyname, r.tablename, r.cmd, roles,
      CASE WHEN newq IS NULL THEN '' ELSE 'USING ('||newq||')' END,
      CASE WHEN newwc IS NULL THEN '' ELSE 'WITH CHECK ('||newwc||')' END);
  END LOOP;
END $do$;

-- 2. Remove the "NULL tenant is visible to everyone" bypass except on shared reference data
DO $do$
DECLARE r record; newq text; newwc text; roles text;
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname, p.cmd, p.qual, p.with_check, p.roles
    FROM pg_policies p
    WHERE p.schemaname='public'
      AND (coalesce(p.qual,'')||coalesce(p.with_check,'')) LIKE '%(tenant_id IS NULL)%'
      AND p.tablename NOT IN (
        'product_catalog','product_oems','product_technologies','oem_technologies',
        'offerings_managed_security','offerings_oems','offerings_offensive_security',
        'offerings_problem_areas','offerings_products','offerings_professional_services',
        'offerings_technologies','sales_territories','territory_assignments',
        'marketing_journeys','email_templates','hr_checklists','leave_policies',
        'expense_categories','asset_categories','contact_lifecycle_stages',
        'canned_responses','support_slas','support_type_templates',
        'escalation_matrix_templates','compliance_frameworks','notifications'
      )
  LOOP
    newq := replace(replace(coalesce(r.qual,''), '(tenant_id IS NULL) OR ', ''), ' OR (tenant_id IS NULL)', '');
    newwc := replace(replace(coalesce(r.with_check,''), '(tenant_id IS NULL) OR ', ''), ' OR (tenant_id IS NULL)', '');
    roles := array_to_string(r.roles, ',');
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO %s %s %s',
      r.policyname, r.tablename, r.cmd, roles,
      CASE WHEN r.qual IS NULL THEN '' ELSE 'USING ('||newq||')' END,
      CASE WHEN r.with_check IS NULL THEN '' ELSE 'WITH CHECK ('||newwc||')' END);
  END LOOP;
END $do$;

-- 3. Notifications: no spoofing other users
DROP POLICY IF EXISTS "Signed-in users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications in their tenant"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()
    OR (
      tenant_id IS NOT NULL
      AND public.user_has_tenant_access(auth.uid(), tenant_id)
      AND EXISTS (
        SELECT 1 FROM public.tenant_members tm
        WHERE tm.user_id = notifications.user_id
          AND tm.tenant_id = notifications.tenant_id
          AND tm.status = 'active'
      )
    )
  )
);

-- 4. Audit log integrity
DROP POLICY IF EXISTS "Signed-in users can insert audit log" ON public.tenant_audit_log;
CREATE POLICY "Users can insert audit entries for own tenant"
ON public.tenant_audit_log FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND public.user_has_tenant_access(auth.uid(), tenant_id)
);

-- 5. History/approval records cannot be forged
DROP POLICY IF EXISTS "Signed-in users can create workflow logs" ON public.workflow_logs;
CREATE POLICY "Privileged users can create workflow logs"
ON public.workflow_logs FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Signed-in users can create approval workflows" ON public.approval_workflows;
CREATE POLICY "Approvers and privileged users can create approvals"
ON public.approval_workflows FOR INSERT TO authenticated
WITH CHECK (
  approver_id = auth.uid()
  OR public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

DROP POLICY IF EXISTS "System can insert history" ON public.deal_registration_history;
CREATE POLICY "Related users can insert registration history"
ON public.deal_registration_history FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_history.deal_registration_id
      AND (
        dr.requester_id = auth.uid()
        OR dr.assigned_to = auth.uid()
        OR (dr.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), dr.tenant_id))
      )
  )
);

DROP POLICY IF EXISTS "Signed-in users can create stage history" ON public.workflow_stage_history;
CREATE POLICY "Related users can insert stage history"
ON public.workflow_stage_history FOR INSERT TO authenticated
WITH CHECK (
  changed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_stage_history.workflow_id
      AND (
        w.target_user_id = auth.uid()
        OR (w.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), w.tenant_id))
      )
  )
);

-- 6. No anonymous execution of SECURITY DEFINER helpers
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