
-- Platform Console: license plans, tenant licenses, module overrides, platform integrations, user audit log

-- 1. License plans catalog
CREATE TABLE public.license_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  seat_cap INTEGER,
  trial_days INTEGER NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.license_plan_modules (
  plan_id UUID NOT NULL REFERENCES public.license_plans(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  PRIMARY KEY (plan_id, module_key)
);

-- 2. Per-tenant license state
CREATE TYPE public.tenant_license_status AS ENUM ('trial', 'active', 'past_due', 'suspended', 'cancelled');
CREATE TYPE public.tenant_payment_status AS ENUM ('paid', 'pending', 'failed', 'na');

CREATE TABLE public.tenant_licenses (
  tenant_id UUID NOT NULL PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.license_plans(id),
  status public.tenant_license_status NOT NULL DEFAULT 'trial',
  seats_licensed INTEGER NOT NULL DEFAULT 5,
  trial_ends_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  payment_status public.tenant_payment_status NOT NULL DEFAULT 'na',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Module overrides (super-admin grants beyond plan)
CREATE TABLE public.tenant_module_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  granted_by UUID,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_key)
);

-- 4. Platform integrations catalog (configured once at platform level)
CREATE TYPE public.platform_integration_category AS ENUM ('billing', 'email', 'monitoring', 'sso', 'infrastructure', 'marketplace');

CREATE TABLE public.platform_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category public.platform_integration_category NOT NULL DEFAULT 'marketplace',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  available_to_tenants BOOLEAN NOT NULL DEFAULT false,
  auto_enable_tier TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_ref TEXT,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. User audit log (cross-tenant actions)
CREATE TABLE public.user_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  actor_id UUID,
  action TEXT NOT NULL,
  tenant_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_audit_log_user ON public.user_audit_log(user_id);
CREATE INDEX idx_user_audit_log_actor ON public.user_audit_log(actor_id);
CREATE INDEX idx_user_audit_log_at ON public.user_audit_log(created_at DESC);

-- Enable RLS on all new tables
ALTER TABLE public.license_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_plan_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_module_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: super admins full access; tenant admins read-only on their own license/overrides
CREATE POLICY "Super admins manage license plans"
  ON public.license_plans FOR ALL
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Anyone authenticated can read active plans"
  ON public.license_plans FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Super admins manage plan modules"
  ON public.license_plan_modules FOR ALL
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Authenticated read plan modules"
  ON public.license_plan_modules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins manage tenant licenses"
  ON public.tenant_licenses FOR ALL
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Tenant admins read own license"
  ON public.tenant_licenses FOR SELECT
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Super admins manage module overrides"
  ON public.tenant_module_overrides FOR ALL
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Tenant members read own module overrides"
  ON public.tenant_module_overrides FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Super admins manage platform integrations"
  ON public.platform_integrations FOR ALL
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Tenant admins read marketplace integrations"
  ON public.platform_integrations FOR SELECT
  USING (auth.uid() IS NOT NULL AND available_to_tenants = true);

CREATE POLICY "Super admins read audit log"
  ON public.user_audit_log FOR SELECT
  USING (public.current_user_is_super_admin());

CREATE POLICY "Super admins write audit log"
  ON public.user_audit_log FOR INSERT
  WITH CHECK (public.current_user_is_super_admin());

-- Updated_at triggers
CREATE TRIGGER trg_license_plans_updated
  BEFORE UPDATE ON public.license_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tenant_licenses_updated
  BEFORE UPDATE ON public.tenant_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_platform_integrations_updated
  BEFORE UPDATE ON public.platform_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 3 default plans matching existing tenant tiers
INSERT INTO public.license_plans (key, name, description, price_monthly, seat_cap, trial_days, sort_order)
VALUES
  ('starter', 'Starter', 'Essentials for small teams', 49, 10, 14, 1),
  ('professional', 'Professional', 'Growing organizations', 199, 50, 14, 2),
  ('enterprise', 'Enterprise', 'Unlimited scale, premium support', 999, NULL, 30, 3);

-- Seed a few platform integrations
INSERT INTO public.platform_integrations (key, name, description, category, is_enabled, available_to_tenants)
VALUES
  ('stripe_billing', 'Stripe Billing', 'Platform billing and subscriptions', 'billing', false, false),
  ('resend_email', 'Resend (Transactional Email)', 'System email delivery', 'email', true, false),
  ('sentry_monitoring', 'Sentry Error Monitoring', 'Centralized error tracking', 'monitoring', false, false),
  ('sso_saml', 'SAML SSO Federation', 'Identity provider for enterprise tenants', 'sso', false, true),
  ('hubspot_marketplace', 'HubSpot CRM', 'Available for tenants to connect', 'marketplace', true, true),
  ('office365_marketplace', 'Microsoft 365', 'Available for tenants to connect', 'marketplace', true, true);
