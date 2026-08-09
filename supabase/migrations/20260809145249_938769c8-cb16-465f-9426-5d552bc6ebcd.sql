-- remote_session_participants: restrict SELECT to entitled sessions
DROP POLICY IF EXISTS "Users can view participants of accessible sessions" ON public.remote_session_participants;
CREATE POLICY "Users can view participants of accessible sessions"
ON public.remote_session_participants
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.remote_sessions s
    WHERE s.id = remote_session_participants.session_id
      AND (
        s.host_id = auth.uid()
        OR (s.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), s.tenant_id))
      )
  )
);

-- remote_session_recordings: restrict SELECT to entitled sessions
DROP POLICY IF EXISTS "Users can view recordings of accessible sessions" ON public.remote_session_recordings;
CREATE POLICY "Users can view recordings of accessible sessions"
ON public.remote_session_recordings
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.remote_sessions s
    WHERE s.id = remote_session_recordings.session_id
      AND (
        s.host_id = auth.uid()
        OR (s.tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), s.tenant_id))
        OR EXISTS (
          SELECT 1 FROM public.remote_session_participants p
          WHERE p.session_id = s.id AND p.user_id = auth.uid()
        )
      )
  )
  OR is_public = true
);

-- sales_targets: fix incorrect profiles.id join (should be profiles.user_id)
DROP POLICY IF EXISTS "Managers can manage targets in their tenant" ON public.sales_targets;
CREATE POLICY "Managers can manage targets in their tenant"
ON public.sales_targets
FOR ALL
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND public.user_has_tenant_access(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.is_tenant_admin(auth.uid(), tenant_id))
)
WITH CHECK (
  tenant_id IS NOT NULL
  AND public.user_has_tenant_access(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.is_tenant_admin(auth.uid(), tenant_id))
);

DROP POLICY IF EXISTS "Users can view targets in their tenant" ON public.sales_targets;
CREATE POLICY "Users can view targets in their tenant"
ON public.sales_targets
FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL AND public.user_has_tenant_access(auth.uid(), tenant_id)
);

-- workflow_settings: restrict reads to admins/HR
DROP POLICY IF EXISTS "Everyone can view workflow settings" ON public.workflow_settings;
CREATE POLICY "Admins and HR can view workflow settings"
ON public.workflow_settings
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_team(auth.uid(), 'hr'::team_type)
);