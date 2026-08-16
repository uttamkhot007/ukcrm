-- ============================================================
-- 1. Chat: remove global-admin bypass on private conversations
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can manage all team messages" ON public.team_chat_messages;

-- ============================================================
-- 2. Financial / support child tables: tenant-scope admin access
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all payment records" ON public.payment_records;
CREATE POLICY "Tenant admins can manage payment records"
ON public.payment_records FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = payment_records.invoice_id
      AND i.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), i.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = payment_records.invoice_id
      AND i.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), i.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all ticket comments2" ON public.ticket_comments;
CREATE POLICY "Tenant admins can manage ticket comments"
ON public.ticket_comments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments.ticket_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments.ticket_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all ticket history" ON public.ticket_history;
CREATE POLICY "Tenant admins can manage ticket history"
ON public.ticket_history FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_history.ticket_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_history.ticket_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all registration comments" ON public.deal_registration_comments;
CREATE POLICY "Tenant admins can manage registration comments"
ON public.deal_registration_comments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_comments.deal_registration_id
      AND dr.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), dr.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_comments.deal_registration_id
      AND dr.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), dr.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all registration history" ON public.deal_registration_history;
CREATE POLICY "Tenant admins can manage registration history"
ON public.deal_registration_history FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_history.deal_registration_id
      AND dr.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), dr.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.deal_registrations dr
    WHERE dr.id = deal_registration_history.deal_registration_id
      AND dr.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), dr.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all evidence" ON public.compliance_evidence;
CREATE POLICY "Tenant admins can manage compliance evidence"
ON public.compliance_evidence FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.compliance_controls c
    JOIN public.compliance_frameworks f ON f.id = c.framework_id
    WHERE c.id = compliance_evidence.control_id
      AND f.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), f.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.compliance_controls c
    JOIN public.compliance_frameworks f ON f.id = c.framework_id
    WHERE c.id = compliance_evidence.control_id
      AND f.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), f.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all request comments" ON public.request_comments;
CREATE POLICY "Tenant admins can manage request comments"
ON public.request_comments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.employee_requests r
    WHERE r.id = request_comments.request_id
      AND r.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), r.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.employee_requests r
    WHERE r.id = request_comments.request_id
      AND r.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), r.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all request history" ON public.request_history;
CREATE POLICY "Tenant admins can manage request history"
ON public.request_history FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.employee_requests r
    WHERE r.id = request_history.request_id
      AND r.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), r.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.employee_requests r
    WHERE r.id = request_history.request_id
      AND r.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), r.tenant_id)
  )
);

-- Tighten the matching read policies that also relied on a bare role check
DROP POLICY IF EXISTS "Users can view comments on their requests" ON public.request_comments;
CREATE POLICY "Users can view comments on their requests"
ON public.request_comments FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.employee_requests r
    WHERE r.id = request_comments.request_id
      AND (
        r.user_id = auth.uid()
        OR (
          r.tenant_id IS NOT NULL
          AND user_has_tenant_access(auth.uid(), r.tenant_id)
          AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can view history of their requests" ON public.request_history;
CREATE POLICY "Users can view history of their requests"
ON public.request_history FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.employee_requests r
    WHERE r.id = request_history.request_id
      AND (
        r.user_id = auth.uid()
        OR (
          r.tenant_id IS NOT NULL
          AND user_has_tenant_access(auth.uid(), r.tenant_id)
          AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
        )
      )
  )
);

-- ============================================================
-- 3. HR workflow tables: scope through hr_workflows.tenant_id
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all workflow logs" ON public.workflow_logs;
DROP POLICY IF EXISTS "Managers can view workflow logs" ON public.workflow_logs;
CREATE POLICY "Tenant privileged users can view workflow logs"
ON public.workflow_logs FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.hr_workflows w
      WHERE w.id = workflow_logs.entity_id
        AND w.tenant_id IS NOT NULL
        AND user_has_tenant_access(auth.uid(), w.tenant_id)
    )
  )
);

DROP POLICY IF EXISTS "Admins can manage all onboarding requests" ON public.onboarding_requests;
DROP POLICY IF EXISTS "Admins and managers can update onboarding requests" ON public.onboarding_requests;
DROP POLICY IF EXISTS "Users can view onboarding requests" ON public.onboarding_requests;
CREATE POLICY "Tenant users can view onboarding requests"
ON public.onboarding_requests FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR requesting_manager_id = auth.uid()
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.hr_workflows w
      WHERE w.id = onboarding_requests.workflow_id
        AND w.tenant_id IS NOT NULL
        AND user_has_tenant_access(auth.uid(), w.tenant_id)
    )
  )
);
CREATE POLICY "Tenant admins can manage onboarding requests"
ON public.onboarding_requests FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = onboarding_requests.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = onboarding_requests.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all resignation requests" ON public.resignation_requests;
DROP POLICY IF EXISTS "Admins and managers can update resignations" ON public.resignation_requests;
DROP POLICY IF EXISTS "Users can view their resignation requests" ON public.resignation_requests;
CREATE POLICY "Tenant users can view resignation requests"
ON public.resignation_requests FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR employee_id = auth.uid()
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.hr_workflows w
      WHERE w.id = resignation_requests.workflow_id
        AND w.tenant_id IS NOT NULL
        AND user_has_tenant_access(auth.uid(), w.tenant_id)
    )
  )
);
CREATE POLICY "Tenant admins can manage resignation requests"
ON public.resignation_requests FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = resignation_requests.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = resignation_requests.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins and managers can manage candidates" ON public.workflow_candidates;
DROP POLICY IF EXISTS "Admins and managers can view candidates" ON public.workflow_candidates;
CREATE POLICY "Tenant privileged users can manage candidates"
ON public.workflow_candidates FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_candidates.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_candidates.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins and managers can manage interviews" ON public.workflow_interviews;
DROP POLICY IF EXISTS "Users can view their interviews" ON public.workflow_interviews;
CREATE POLICY "Tenant privileged users can manage interviews"
ON public.workflow_interviews FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_interviews.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_interviews.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
);
CREATE POLICY "Interviewers can view their interviews"
ON public.workflow_interviews FOR SELECT TO authenticated
USING (interviewer_id = auth.uid() OR is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can manage offers" ON public.workflow_offers;
DROP POLICY IF EXISTS "Admins and managers can view offers" ON public.workflow_offers;
CREATE POLICY "Tenant privileged users can manage offers"
ON public.workflow_offers FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_offers.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_offers.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all workflow comments" ON public.workflow_comments;
CREATE POLICY "Tenant admins can manage workflow comments"
ON public.workflow_comments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_comments.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_comments.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage all stage history" ON public.workflow_stage_history;
CREATE POLICY "Tenant admins can manage stage history"
ON public.workflow_stage_history FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_stage_history.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.hr_workflows w
    WHERE w.id = workflow_stage_history.workflow_id
      AND w.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), w.tenant_id)
  )
);

-- ============================================================
-- 4. approval_workflows: add tenant scope
-- ============================================================
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.approval_workflows aw
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE aw.tenant_id IS NULL AND p.user_id = aw.approver_id AND p.tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_workflows_tenant_id ON public.approval_workflows(tenant_id);

DROP POLICY IF EXISTS "Signed-in users can view approval workflows" ON public.approval_workflows;
CREATE POLICY "Tenant users can view approval workflows"
ON public.approval_workflows FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR approver_id = auth.uid()
  OR (tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id))
);

DROP POLICY IF EXISTS "Approvers and admins can update approval workflows" ON public.approval_workflows;
CREATE POLICY "Approvers and tenant admins can update approval workflows"
ON public.approval_workflows FOR UPDATE TO authenticated
USING (
  approver_id = auth.uid()
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id IS NOT NULL
    AND user_has_tenant_access(auth.uid(), tenant_id)
  )
)
WITH CHECK (
  approver_id = auth.uid()
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id IS NOT NULL
    AND user_has_tenant_access(auth.uid(), tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins can delete approval workflows" ON public.approval_workflows;
CREATE POLICY "Tenant admins can delete approval workflows"
ON public.approval_workflows FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id IS NOT NULL
  AND user_has_tenant_access(auth.uid(), tenant_id)
);

DROP POLICY IF EXISTS "Approvers and privileged users can create approvals" ON public.approval_workflows;
CREATE POLICY "Approvers and privileged users can create approvals"
ON public.approval_workflows FOR INSERT TO authenticated
WITH CHECK (
  (approver_id = auth.uid() OR is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'manager'::app_role))
  AND (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))
);

-- ============================================================
-- 5. SOP versions / images: scope through sops.tenant_id
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view SOP versions" ON public.sop_versions;
CREATE POLICY "Tenant users can view SOP versions"
ON public.sop_versions FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.sops s
    WHERE s.id = sop_versions.sop_id
      AND (
        s.created_by = auth.uid()
        OR (s.tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), s.tenant_id))
      )
  )
);

DROP POLICY IF EXISTS "Admins can manage all sop versions" ON public.sop_versions;
CREATE POLICY "Tenant admins can manage SOP versions"
ON public.sop_versions FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.sops s
    WHERE s.id = sop_versions.sop_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.sops s
    WHERE s.id = sop_versions.sop_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
);

DROP POLICY IF EXISTS "Authenticated users can view SOP images" ON public.sop_images;
CREATE POLICY "Tenant users can view SOP images"
ON public.sop_images FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.sops s
    WHERE s.id = sop_images.sop_id
      AND (
        s.created_by = auth.uid()
        OR (s.tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), s.tenant_id))
      )
  )
);

DROP POLICY IF EXISTS "Admins can delete SOP images" ON public.sop_images;
CREATE POLICY "Tenant admins can delete SOP images"
ON public.sop_images FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.sops s
    WHERE s.id = sop_images.sop_id
      AND s.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), s.tenant_id)
  )
);

-- ============================================================
-- 6. user_teams: tenant-aware admin management via target profile
-- ============================================================
DROP POLICY IF EXISTS "Only admins can insert teams" ON public.user_teams;
DROP POLICY IF EXISTS "Only admins can update teams" ON public.user_teams;
DROP POLICY IF EXISTS "Only admins can delete teams" ON public.user_teams;
DROP POLICY IF EXISTS "Users can view their own teams" ON public.user_teams;

CREATE POLICY "Tenant admins can insert teams"
ON public.user_teams FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_teams.user_id
      AND p.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Tenant admins can update teams"
ON public.user_teams FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_teams.user_id
      AND p.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Tenant admins can delete teams"
ON public.user_teams FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_teams.user_id
      AND p.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Users and tenant admins can view teams"
ON public.user_teams FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_platform_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_teams.user_id
        AND p.tenant_id IS NOT NULL
        AND user_has_tenant_access(auth.uid(), p.tenant_id)
    )
  )
);

-- ============================================================
-- 7. exchange_rate_history: restrict to tenant members
-- ============================================================
DROP POLICY IF EXISTS "Everyone can view exchange rates" ON public.exchange_rate_history;
CREATE POLICY "Tenant members can view exchange rates"
ON public.exchange_rate_history FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id IS NOT NULL
  )
);