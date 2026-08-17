
-- helper: do two users share an active tenant?
CREATE OR REPLACE FUNCTION public.users_share_tenant(_actor uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members a
    JOIN public.tenant_members b ON b.tenant_id = a.tenant_id
    WHERE a.user_id = _actor AND a.status = 'active'
      AND b.user_id = _target AND b.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles pa
    JOIN public.profiles pb ON pb.tenant_id = pa.tenant_id
    WHERE pa.user_id = _actor AND pb.user_id = _target AND pa.tenant_id IS NOT NULL
  );
$$;

-- 1. compliance_assessments
DROP POLICY IF EXISTS "Admins can manage assessments" ON public.compliance_assessments;
CREATE POLICY "Admins can manage assessments in their tenant"
ON public.compliance_assessments FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.compliance_frameworks f
    WHERE f.id = compliance_assessments.framework_id
      AND f.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), f.tenant_id)
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.compliance_frameworks f
    WHERE f.id = compliance_assessments.framework_id
      AND f.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), f.tenant_id)
  )
);

-- 2. deal_products (tenant via deals)
DROP POLICY IF EXISTS "Users with sales access can manage deal products" ON public.deal_products;
DROP POLICY IF EXISTS "Users with sales access can view deal products" ON public.deal_products;
CREATE POLICY "Sales users can view deal products in their tenant"
ON public.deal_products FOR SELECT TO authenticated
USING (
  has_sales_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_products.deal_id
      AND d.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), d.tenant_id)
  )
);
CREATE POLICY "Sales users can manage deal products in their tenant"
ON public.deal_products FOR ALL TO authenticated
USING (
  has_sales_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_products.deal_id
      AND d.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), d.tenant_id)
  )
)
WITH CHECK (
  has_sales_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_products.deal_id
      AND d.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), d.tenant_id)
  )
);

-- 3. email_sequence_enrollments (tenant via email_sequences)
DROP POLICY IF EXISTS "Users can create enrollments" ON public.email_sequence_enrollments;
DROP POLICY IF EXISTS "Users can view enrollments" ON public.email_sequence_enrollments;
DROP POLICY IF EXISTS "Users can update enrollments" ON public.email_sequence_enrollments;
CREATE POLICY "Sales users can create enrollments in their tenant"
ON public.email_sequence_enrollments FOR INSERT TO authenticated
WITH CHECK (
  has_sales_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_enrollments.sequence_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
);
CREATE POLICY "Sales users can view enrollments in their tenant"
ON public.email_sequence_enrollments FOR SELECT TO authenticated
USING (
  has_sales_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_enrollments.sequence_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
);
CREATE POLICY "Sales users can update enrollments in their tenant"
ON public.email_sequence_enrollments FOR UPDATE TO authenticated
USING (
  (auth.uid() = enrolled_by OR has_role(auth.uid(), 'admin'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_enrollments.sequence_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
);
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.email_sequence_enrollments;
CREATE POLICY "Admins can manage enrollments in their tenant"
ON public.email_sequence_enrollments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_enrollments.sequence_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_enrollments.sequence_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
);

-- 4. sales_automations insert + select
DROP POLICY IF EXISTS "Users can create automations" ON public.sales_automations;
CREATE POLICY "Sales users can create automations in their tenant"
ON public.sales_automations FOR INSERT TO authenticated
WITH CHECK (has_sales_access(auth.uid()) AND tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id));
DROP POLICY IF EXISTS "Users can view automations" ON public.sales_automations;
CREATE POLICY "Sales users can view automations in their tenant"
ON public.sales_automations FOR SELECT TO authenticated
USING (has_sales_access(auth.uid()) AND tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id));

-- 5. sales_teams / sales_team_members scoped by shared tenant
DROP POLICY IF EXISTS "Admins can manage sales teams" ON public.sales_teams;
CREATE POLICY "Admins can manage sales teams in their tenant"
ON public.sales_teams FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (leader_id IS NULL OR public.users_share_tenant(auth.uid(), leader_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (leader_id IS NULL OR public.users_share_tenant(auth.uid(), leader_id))
);

DROP POLICY IF EXISTS "Admins can manage team members" ON public.sales_team_members;
CREATE POLICY "Admins can manage team members in their tenant"
ON public.sales_team_members FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND public.users_share_tenant(auth.uid(), user_id)
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND public.users_share_tenant(auth.uid(), user_id)
);

-- 6. tenants: remove global admin role access
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;

-- 7. tender_documents / tender_team write scoping
DROP POLICY IF EXISTS "Users with sales access can manage tender documents" ON public.tender_documents;
CREATE POLICY "Sales users can manage tender documents in their tenant"
ON public.tender_documents FOR ALL TO authenticated
USING (has_sales_access(auth.uid()) AND tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (has_sales_access(auth.uid()) AND tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users with sales access can manage tender team" ON public.tender_team;
CREATE POLICY "Sales users can manage tender team in their tenant"
ON public.tender_team FOR ALL TO authenticated
USING (has_sales_access(auth.uid()) AND tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (has_sales_access(auth.uid()) AND tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id));

-- 8. territory_assignments
DROP POLICY IF EXISTS "Admins can manage territory assignments" ON public.territory_assignments;
CREATE POLICY "Admins can manage territory assignments in their tenant"
ON public.territory_assignments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.sales_territories t
    WHERE t.id = territory_assignments.territory_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.sales_territories t
    WHERE t.id = territory_assignments.territory_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
);

-- 9. user_roles: tenant-scoped role management
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Users and same-tenant admins can view roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (has_role(auth.uid(), 'admin'::app_role) AND public.users_share_tenant(auth.uid(), user_id))
);
CREATE POLICY "Same-tenant admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND public.users_share_tenant(auth.uid(), user_id));
CREATE POLICY "Same-tenant admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND public.users_share_tenant(auth.uid(), user_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND public.users_share_tenant(auth.uid(), user_id));
CREATE POLICY "Same-tenant admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND public.users_share_tenant(auth.uid(), user_id));

-- 10. web_form_captures select scoping
DROP POLICY IF EXISTS "Users with sales/marketing access can view form captures" ON public.web_form_captures;
CREATE POLICY "Sales users can view form captures in their tenant"
ON public.web_form_captures FOR SELECT TO authenticated
USING (has_sales_access(auth.uid()) AND tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id));
