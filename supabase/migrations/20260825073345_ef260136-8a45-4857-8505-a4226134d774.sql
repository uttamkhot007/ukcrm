
-- 1. Revoke public execute on SECURITY DEFINER helper
REVOKE EXECUTE ON FUNCTION public.users_share_tenant(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.users_share_tenant(uuid, uuid) TO authenticated;

-- 2. chat_participants
DROP POLICY IF EXISTS "Admins can manage all participants" ON public.chat_participants;
CREATE POLICY "Tenant admins can manage participants"
ON public.chat_participants FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_participants.conversation_id
      AND c.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), c.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_participants.conversation_id
      AND c.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), c.tenant_id)
  )
);

-- 3. customer_organization_access
DROP POLICY IF EXISTS "Admins can manage customer access" ON public.customer_organization_access;
CREATE POLICY "Tenant admins can manage customer access"
ON public.customer_organization_access FOR ALL TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.alliance_organizations o
    WHERE o.id = customer_organization_access.organization_id
      AND o.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), o.tenant_id)
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.alliance_organizations o
    WHERE o.id = customer_organization_access.organization_id
      AND o.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), o.tenant_id)
  )
);

-- 4. customer_support_ticket_comments
DROP POLICY IF EXISTS "Admins can manage all ticket comments" ON public.customer_support_ticket_comments;
DROP POLICY IF EXISTS "Staff can view all comments" ON public.customer_support_ticket_comments;
CREATE POLICY "Tenant admins can manage ticket comments"
ON public.customer_support_ticket_comments FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.customer_support_tickets t
    WHERE t.id = customer_support_ticket_comments.ticket_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.customer_support_tickets t
    WHERE t.id = customer_support_ticket_comments.ticket_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
);
CREATE POLICY "Tenant staff can view ticket comments"
ON public.customer_support_ticket_comments FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.customer_support_tickets t
    WHERE t.id = customer_support_ticket_comments.ticket_id
      AND t.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), t.tenant_id)
  )
);

-- also tighten the customer-facing select policy (it OR'd unscoped role checks)
DROP POLICY IF EXISTS "Customers can view non-internal comments" ON public.customer_support_ticket_comments;
CREATE POLICY "Customers can view non-internal comments"
ON public.customer_support_ticket_comments FOR SELECT TO authenticated
USING (
  is_internal = false AND EXISTS (
    SELECT 1 FROM public.customer_support_tickets cst
    JOIN public.customer_organization_access coa ON coa.organization_id = cst.organization_id
    WHERE cst.id = customer_support_ticket_comments.ticket_id AND coa.user_id = auth.uid()
  )
);

-- 5. deal_stage_progression_log
DROP POLICY IF EXISTS "Admins can manage all progression logs" ON public.deal_stage_progression_log;
CREATE POLICY "Tenant admins can manage progression logs"
ON public.deal_stage_progression_log FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_stage_progression_log.deal_id
      AND d.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), d.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_stage_progression_log.deal_id
      AND d.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), d.tenant_id)
  )
);

-- 6. event_wishes
DROP POLICY IF EXISTS "Admins can manage all event wishes" ON public.event_wishes;
CREATE POLICY "Tenant admins can manage event wishes"
ON public.event_wishes FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND users_share_tenant(auth.uid(), event_wishes.sender_id)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND users_share_tenant(auth.uid(), event_wishes.sender_id)
);

-- 7. legal_document_approvals
DROP POLICY IF EXISTS "Admins can manage all legal approvals" ON public.legal_document_approvals;
CREATE POLICY "Tenant admins can manage legal approvals"
ON public.legal_document_approvals FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.legal_documents d
    WHERE d.id = legal_document_approvals.document_id
      AND d.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), d.tenant_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.legal_documents d
    WHERE d.id = legal_document_approvals.document_id
      AND d.tenant_id IS NOT NULL
      AND user_has_tenant_access(auth.uid(), d.tenant_id)
  )
);

-- 8. notification_preferences
DROP POLICY IF EXISTS "Admins can manage all notification prefs" ON public.notification_preferences;
CREATE POLICY "Tenant admins can manage notification prefs"
ON public.notification_preferences FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND users_share_tenant(auth.uid(), notification_preferences.user_id)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND users_share_tenant(auth.uid(), notification_preferences.user_id)
);

-- 9. request_history: forged audit entries
DROP POLICY IF EXISTS "System can insert history" ON public.request_history;
CREATE POLICY "Users can insert history on accessible requests"
ON public.request_history FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.employee_requests r
    WHERE r.id = request_history.request_id
      AND (
        r.user_id = auth.uid()
        OR (r.tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), r.tenant_id)
            AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
      )
  )
);
