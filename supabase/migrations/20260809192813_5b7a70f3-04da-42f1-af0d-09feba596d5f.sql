-- =========================================================
-- 1. Move sensitive HR/finance data out of public.profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.employee_sensitive_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tenant_id UUID,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_relation TEXT,
  current_address TEXT,
  address TEXT,
  postal_code TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_branch TEXT,
  esi_number TEXT,
  esi_dispensary TEXT,
  pf_number TEXT,
  uan_number TEXT,
  gratuity_nomination_name TEXT,
  gratuity_nomination_relation TEXT,
  gratuity_nomination_percentage NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_sensitive_details TO authenticated;
GRANT ALL ON public.employee_sensitive_details TO service_role;

ALTER TABLE public.employee_sensitive_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or HR can view sensitive details"
ON public.employee_sensitive_details FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_team(auth.uid(), 'hr')
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Owner or HR can insert sensitive details"
ON public.employee_sensitive_details FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_team(auth.uid(), 'hr')
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Owner or HR can update sensitive details"
ON public.employee_sensitive_details FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_team(auth.uid(), 'hr')
  OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_team(auth.uid(), 'hr')
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Admins can delete sensitive details"
ON public.employee_sensitive_details FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_platform_admin(auth.uid())
);

CREATE TRIGGER update_employee_sensitive_details_updated_at
BEFORE UPDATE ON public.employee_sensitive_details
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_employee_sensitive_details_tenant
  ON public.employee_sensitive_details(tenant_id);

-- migrate existing data
INSERT INTO public.employee_sensitive_details (
  user_id, tenant_id,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
  emergency_contact_relation, current_address, address, postal_code,
  bank_name, bank_account_number, bank_ifsc_code, bank_branch,
  esi_number, esi_dispensary, pf_number, uan_number,
  gratuity_nomination_name, gratuity_nomination_relation, gratuity_nomination_percentage
)
SELECT
  p.user_id, p.tenant_id,
  p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relationship,
  p.emergency_contact_relation, p.current_address, p.address, p.postal_code,
  p.bank_name, p.bank_account_number, p.bank_ifsc_code, p.bank_branch,
  p.esi_number, p.esi_dispensary, p.pf_number, p.uan_number,
  p.gratuity_nomination_name, p.gratuity_nomination_relation, p.gratuity_nomination_percentage
FROM public.profiles p
WHERE p.user_id IS NOT NULL
  AND COALESCE(
    p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relationship,
    p.emergency_contact_relation, p.current_address, p.address, p.postal_code,
    p.bank_name, p.bank_account_number, p.bank_ifsc_code, p.bank_branch,
    p.esi_number, p.esi_dispensary, p.pf_number, p.uan_number,
    p.gratuity_nomination_name, p.gratuity_nomination_relation,
    p.gratuity_nomination_percentage::text
  ) IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS emergency_contact_phone,
  DROP COLUMN IF EXISTS emergency_contact_relationship,
  DROP COLUMN IF EXISTS emergency_contact_relation,
  DROP COLUMN IF EXISTS current_address,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_ifsc_code,
  DROP COLUMN IF EXISTS bank_branch,
  DROP COLUMN IF EXISTS esi_number,
  DROP COLUMN IF EXISTS esi_dispensary,
  DROP COLUMN IF EXISTS pf_number,
  DROP COLUMN IF EXISTS uan_number,
  DROP COLUMN IF EXISTS gratuity_nomination_name,
  DROP COLUMN IF EXISTS gratuity_nomination_relation,
  DROP COLUMN IF EXISTS gratuity_nomination_percentage;

-- =========================================================
-- 2. alliance_users: restrict PII to need-to-know roles
-- =========================================================
DROP POLICY IF EXISTS "Users can view alliance users" ON public.alliance_users;

CREATE POLICY "Need-to-know roles can view alliance users"
ON public.alliance_users FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_platform_admin(auth.uid())
  OR (
    tenant_id IS NOT NULL
    AND public.user_has_tenant_access(auth.uid(), tenant_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
      OR public.has_any_team(auth.uid(), ARRAY['sales','presales','inside_sales','management','marketing']::team_type[])
    )
  )
);

-- =========================================================
-- 3. employee_sales_teams: remove USING (true)
-- =========================================================
DROP POLICY IF EXISTS "Everyone can view sales teams" ON public.employee_sales_teams;

CREATE POLICY "Tenant members can view sales team assignments"
ON public.employee_sales_teams FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_sales_teams.user_id
      AND p.tenant_id IS NOT NULL
      AND public.user_has_tenant_access(auth.uid(), p.tenant_id)
  )
);

-- =========================================================
-- 4. remote_sessions: fix self-referential participant check
-- =========================================================
DROP POLICY IF EXISTS "Users can view sessions they host or participate in" ON public.remote_sessions;

CREATE POLICY "Users can view sessions they host or participate in"
ON public.remote_sessions FOR SELECT TO authenticated
USING (
  auth.uid() = host_id
  OR auth.uid() = customer_id
  OR public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.remote_session_participants rsp
    WHERE rsp.session_id = remote_sessions.id
      AND rsp.user_id = auth.uid()
  )
  OR (
    tenant_id IS NOT NULL
    AND public.user_has_tenant_access(auth.uid(), tenant_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
    )
  )
);

-- =========================================================
-- 5. Harden SECURITY DEFINER helpers callable by signed-in users
--    so they can only answer about the caller themselves.
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END
$$;

CREATE OR REPLACE FUNCTION public.has_team(_user_id uuid, _team team_type)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_teams WHERE user_id = _user_id AND team = _team)
  END
$$;

CREATE OR REPLACE FUNCTION public.has_any_team(_user_id uuid, _teams team_type[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_teams WHERE user_id = _user_id AND team = ANY(_teams))
  END
$$;

CREATE OR REPLACE FUNCTION public.has_sales_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_teams
      WHERE user_id = _user_id AND team IN ('sales','presales','inside_sales','management')
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_employee_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id AND (user_category IS NULL OR user_category != 'customer')
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE COALESCE((SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id), false)
  END
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role)
      OR COALESCE((SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id), false)
  END
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE user_id = _user_id AND tenant_id = _tenant_id AND status = 'active'
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE user_id = _user_id AND tenant_id = _tenant_id
        AND role IN ('owner','admin') AND status = 'active'
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.user_has_tenant_access(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE user_id = _user_id AND tenant_id = _tenant_id AND status = 'active'
    ) OR COALESCE((SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id), false)
  END
$$;

CREATE OR REPLACE FUNCTION public.can_view_people_intelligence(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN current_user IN ('authenticated','anon') AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE public.user_has_tenant_access(_user_id, _tenant_id)
      AND (
        public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'manager')
        OR public.is_management(_user_id)
        OR public.has_team(_user_id, 'hr')
        OR public.is_platform_admin(_user_id)
      )
  END
$$;

REVOKE EXECUTE ON FUNCTION
  public.has_role(uuid, app_role),
  public.has_team(uuid, team_type),
  public.has_any_team(uuid, team_type[]),
  public.has_sales_access(uuid),
  public.is_employee_user(uuid),
  public.is_super_admin(uuid),
  public.is_platform_admin(uuid),
  public.is_tenant_member(uuid, uuid),
  public.is_tenant_admin(uuid, uuid),
  public.user_has_tenant_access(uuid, uuid),
  public.can_view_people_intelligence(uuid, uuid)
FROM anon;