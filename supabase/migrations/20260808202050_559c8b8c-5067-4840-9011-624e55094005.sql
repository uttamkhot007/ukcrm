
-- Helper: tenant access check reuse (existing user_has_tenant_access)

-- alliance_users: remove global admin/manager branch
DROP POLICY IF EXISTS "Users can view alliance users" ON public.alliance_users;
CREATE POLICY "Users can view alliance users" ON public.alliance_users
FOR SELECT TO authenticated
USING (
  (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
  OR created_by = auth.uid()
  OR public.is_platform_admin(auth.uid())
);

-- compliance_assessments
DROP POLICY IF EXISTS "Users can view assessments" ON public.compliance_assessments;
CREATE POLICY "Users can view assessments" ON public.compliance_assessments
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR assessor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.compliance_frameworks f
    WHERE f.id = compliance_assessments.framework_id
      AND (f.created_by = auth.uid()
        OR (f.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), f.tenant_id)))
  )
);

-- compliance_evidence
DROP POLICY IF EXISTS "Users can view evidence" ON public.compliance_evidence;
CREATE POLICY "Users can view evidence" ON public.compliance_evidence
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.compliance_controls c
    JOIN public.compliance_frameworks f ON f.id = c.framework_id
    WHERE c.id = compliance_evidence.control_id
      AND (f.created_by = auth.uid()
        OR (f.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), f.tenant_id)))
  )
);

-- deal_activities
DROP POLICY IF EXISTS "Users can view deal activities" ON public.deal_activities;
CREATE POLICY "Users can view deal activities" ON public.deal_activities
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
  OR EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_activities.deal_id
      AND (d.user_id = auth.uid()
        OR (d.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), d.tenant_id)))
  )
);

-- deal_registration_comments / history: add tenant scoping to the accounts-team branch
DROP POLICY IF EXISTS "Users can view comments on accessible registrations" ON public.deal_registration_comments;
CREATE POLICY "Users can view comments on accessible registrations" ON public.deal_registration_comments
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_comments.deal_registration_id
      AND (dr.requester_id = auth.uid()
        OR dr.assigned_to = auth.uid()
        OR (dr.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), dr.tenant_id)
            AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_team(auth.uid(), 'accounts'::team_type))))
  )
);

DROP POLICY IF EXISTS "Users can view history of accessible registrations" ON public.deal_registration_history;
CREATE POLICY "Users can view history of accessible registrations" ON public.deal_registration_history
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_history.deal_registration_id
      AND (dr.requester_id = auth.uid()
        OR dr.assigned_to = auth.uid()
        OR (dr.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), dr.tenant_id)
            AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_team(auth.uid(), 'accounts'::team_type))))
  )
);

-- legal document comments / approvals
DROP POLICY IF EXISTS "Users can view all comments" ON public.legal_document_comments;
CREATE POLICY "Users can view document comments" ON public.legal_document_comments
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.legal_documents d
    WHERE d.id = legal_document_comments.document_id
      AND (d.created_by = auth.uid()
        OR (d.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), d.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view all approvals" ON public.legal_document_approvals;
CREATE POLICY "Users can view document approvals" ON public.legal_document_approvals
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.legal_documents d
    WHERE d.id = legal_document_approvals.document_id
      AND (d.created_by = auth.uid()
        OR (d.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), d.tenant_id)))
  )
);

-- order_processing_requests
DROP POLICY IF EXISTS "Users can view all order processing requests" ON public.order_processing_requests;
CREATE POLICY "Users can view order processing requests in their tenant" ON public.order_processing_requests
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR created_by = auth.uid()
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
);

-- poc_requests
DROP POLICY IF EXISTS "Users can view all POC requests" ON public.poc_requests;
DROP POLICY IF EXISTS "Users can view POCs in their tenant" ON public.poc_requests;
CREATE POLICY "Users can view POCs in their tenant" ON public.poc_requests
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR requested_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
);

-- quotations
DROP POLICY IF EXISTS "Users can view all quotations" ON public.quotations;
CREATE POLICY "Users can view quotations in their tenant" ON public.quotations
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
);

-- renewals
DROP POLICY IF EXISTS "Users can view all renewals" ON public.renewals;
CREATE POLICY "Users can view renewals in their tenant" ON public.renewals
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
);

-- rfp_responses
DROP POLICY IF EXISTS "Users can view all RFP responses" ON public.rfp_responses;
CREATE POLICY "Users can view RFP responses in their tenant" ON public.rfp_responses
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
);

-- technical_assessments
DROP POLICY IF EXISTS "Users can view all assessments" ON public.technical_assessments;
CREATE POLICY "Users can view assessments in their tenant" ON public.technical_assessments
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR assessed_by = auth.uid()
  OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id))
);

-- sales_teams / sales_team_members
DROP POLICY IF EXISTS "Everyone can view sales teams" ON public.sales_teams;
CREATE POLICY "Members and admins can view sales teams" ON public.sales_teams
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR leader_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.sales_team_members m
    WHERE m.team_id = sales_teams.id AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Everyone can view team members" ON public.sales_team_members;
CREATE POLICY "Members and admins can view sales team members" ON public.sales_team_members
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.sales_teams t
    WHERE t.id = sales_team_members.team_id AND t.leader_id = auth.uid()
  )
);

-- ticket comments / history
DROP POLICY IF EXISTS "Users can view ticket comments" ON public.ticket_comments;
CREATE POLICY "Users can view ticket comments" ON public.ticket_comments
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments.ticket_id
      AND (t.created_by = auth.uid()
        OR (t.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), t.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view ticket history" ON public.ticket_history;
CREATE POLICY "Users can view ticket history" ON public.ticket_history
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_history.ticket_id
      AND (t.created_by = auth.uid()
        OR (t.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), t.tenant_id)))
  )
);

-- workflow comments / stage history / stage completions (hr_workflows scoped)
DROP POLICY IF EXISTS "Users can view workflow comments" ON public.workflow_comments;
CREATE POLICY "Users can view workflow comments" ON public.workflow_comments
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_comments.workflow_id
      AND (w.target_user_id = auth.uid()
        OR (w.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), w.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view stage history" ON public.workflow_stage_history;
CREATE POLICY "Users can view stage history" ON public.workflow_stage_history
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_stage_history.workflow_id
      AND (w.target_user_id = auth.uid()
        OR (w.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), w.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view stage completions" ON public.workflow_stage_completions;
CREATE POLICY "Users can view stage completions" ON public.workflow_stage_completions
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_stage_completions.workflow_id
      AND (w.target_user_id = auth.uid()
        OR (w.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), w.tenant_id)))
  )
);

-- project child tables: scope through projects tenant
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON public.project_tasks;
CREATE POLICY "Users can view tasks in their projects" ON public.project_tasks
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
CREATE POLICY "Users can view project members" ON public.project_members
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view milestones" ON public.project_milestones;
CREATE POLICY "Users can view milestones" ON public.project_milestones
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view project documents" ON public.project_documents;
CREATE POLICY "Users can view project documents" ON public.project_documents
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_documents.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view project phases" ON public.project_phases;
CREATE POLICY "Users can view project phases" ON public.project_phases
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_phases.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view project products" ON public.project_products;
CREATE POLICY "Users can view project products" ON public.project_products
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_products.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view project RACI" ON public.project_raci;
CREATE POLICY "Users can view project RACI" ON public.project_raci
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_raci.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

DROP POLICY IF EXISTS "Users can view project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Users can view project stakeholders" ON public.project_stakeholders
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_stakeholders.project_id
      AND (p.created_by = auth.uid() OR p.project_manager_id = auth.uid()
        OR (p.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), p.tenant_id)))
  )
);

-- Revoke direct EXECUTE on SECURITY DEFINER functions that clients never call
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (p.prorettype = 'trigger'::regtype
           OR p.proname IN ('promote_to_admin', 'cleanup_expired_messages'))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;
