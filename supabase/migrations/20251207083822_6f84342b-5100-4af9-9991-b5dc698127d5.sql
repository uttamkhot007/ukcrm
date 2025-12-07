
-- Multi-Tenant SaaS Platform Schema

-- Tenant status enum
CREATE TYPE public.tenant_status AS ENUM ('pending', 'active', 'suspended', 'cancelled');

-- Tenant tier enum for billing/features
CREATE TYPE public.tenant_tier AS ENUM ('starter', 'professional', 'enterprise');

-- Data region enum for compliance
CREATE TYPE public.data_region AS ENUM ('us-east', 'us-west', 'eu-central', 'ap-south', 'ap-southeast');

-- Create tenants table (organizations/customers)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT UNIQUE,
  logo_url TEXT,
  status tenant_status NOT NULL DEFAULT 'pending',
  tier tenant_tier NOT NULL DEFAULT 'starter',
  data_region data_region NOT NULL DEFAULT 'us-east',
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{"primary_color": "#3B82F6", "secondary_color": "#10B981"}'::jsonb,
  billing_email TEXT,
  max_users INTEGER DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT
);

-- Create tenant_modules table for module provisioning
CREATE TABLE public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_key)
);

-- Create tenant_ai_configs for per-tenant AI engine
CREATE TABLE public.tenant_ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  ai_model TEXT DEFAULT 'google/gemini-2.5-flash',
  system_prompt TEXT,
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  custom_instructions JSONB DEFAULT '{}'::jsonb,
  knowledge_base_enabled BOOLEAN DEFAULT false,
  monthly_ai_credits INTEGER DEFAULT 1000,
  used_ai_credits INTEGER DEFAULT 0,
  credits_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant_members for user-tenant relationship
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  is_primary_owner BOOLEAN DEFAULT false,
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Create tenant_invitations for user onboarding
CREATE TABLE public.tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add tenant_id to existing tables (profiles first as reference)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Module definitions master table
CREATE TABLE public.module_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  is_core BOOLEAN DEFAULT false,
  default_enabled BOOLEAN DEFAULT true,
  tier_required tenant_tier DEFAULT 'starter',
  sort_order INTEGER DEFAULT 0,
  settings_schema JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default module definitions
INSERT INTO public.module_definitions (key, name, description, icon, category, is_core, default_enabled, sort_order) VALUES
  ('dashboard', 'Dashboard', 'Overview and analytics dashboard', 'LayoutDashboard', 'core', true, true, 1),
  ('hr', 'HR & Employee', 'HR management, attendance, requests', 'Users', 'hr', false, true, 2),
  ('sales', 'Sales & CRM', 'Leads, deals, contacts, quotations', 'TrendingUp', 'sales', false, true, 3),
  ('presales', 'Pre-Sales', 'Demos, POCs, technical assessments', 'Presentation', 'sales', false, false, 4),
  ('inside_sales', 'Inside Sales', 'Prospect management and follow-ups', 'Phone', 'sales', false, false, 5),
  ('support', 'Customer Support', 'Ticketing and SLA management', 'HeadphonesIcon', 'support', false, true, 6),
  ('accounts', 'Accounts', 'Order processing and workflows', 'Building2', 'finance', false, true, 7),
  ('billing', 'Billing', 'Invoicing and payments', 'CreditCard', 'finance', false, true, 8),
  ('finance', 'Finance', 'Financial operations', 'Wallet', 'finance', false, false, 9),
  ('compliance', 'Compliance', 'Compliance frameworks and controls', 'Shield', 'governance', false, false, 10),
  ('legal', 'Legal', 'Legal document management', 'FileText', 'governance', false, false, 11),
  ('renewals', 'Renewals', 'Contract and subscription renewals', 'RefreshCw', 'operations', false, true, 12),
  ('management', 'Management', 'Management portal and reports', 'Crown', 'admin', false, false, 13),
  ('ai_assistant', 'AI Assistant', 'AI-powered assistance and automation', 'Bot', 'ai', false, true, 14);

-- Tenant usage tracking
CREATE TABLE public.tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  storage_used_bytes BIGINT DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_start)
);

-- Tenant audit log
CREATE TABLE public.tenant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_log ENABLE ROW LEVEL SECURITY;

-- Function to get user's current tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = _user_id AND status = 'active'
  LIMIT 1
$$;

-- Function to check if user is tenant admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

-- Function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND status = 'active'
  )
$$;

-- Function to check if tenant has module enabled
CREATE OR REPLACE FUNCTION public.tenant_has_module(_tenant_id UUID, _module_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_modules
    WHERE tenant_id = _tenant_id
      AND module_key = _module_key
      AND is_enabled = true
  )
$$;

-- RLS Policies for tenants
CREATE POLICY "Users can view their tenant"
  ON public.tenants FOR SELECT
  USING (is_tenant_member(auth.uid(), id));

CREATE POLICY "Tenant admins can update their tenant"
  ON public.tenants FOR UPDATE
  USING (is_tenant_admin(auth.uid(), id));

CREATE POLICY "Super admins can manage all tenants"
  ON public.tenants FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for tenant_modules
CREATE POLICY "Tenant members can view modules"
  ON public.tenant_modules FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can manage modules"
  ON public.tenant_modules FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- RLS Policies for tenant_ai_configs
CREATE POLICY "Tenant members can view AI config"
  ON public.tenant_ai_configs FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can manage AI config"
  ON public.tenant_ai_configs FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- RLS Policies for tenant_members
CREATE POLICY "Tenant members can view other members"
  ON public.tenant_members FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can manage members"
  ON public.tenant_members FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- RLS Policies for tenant_invitations
CREATE POLICY "Tenant admins can manage invitations"
  ON public.tenant_invitations FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view invitation by token"
  ON public.tenant_invitations FOR SELECT
  USING (true);

-- RLS Policies for module_definitions (public read)
CREATE POLICY "Anyone can view module definitions"
  ON public.module_definitions FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage module definitions"
  ON public.module_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for tenant_usage
CREATE POLICY "Tenant members can view usage"
  ON public.tenant_usage FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "System can manage usage"
  ON public.tenant_usage FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for tenant_audit_log
CREATE POLICY "Tenant admins can view audit log"
  ON public.tenant_audit_log FOR SELECT
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log"
  ON public.tenant_audit_log FOR INSERT
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_modules_updated_at
  BEFORE UPDATE ON public.tenant_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_ai_configs_updated_at
  BEFORE UPDATE ON public.tenant_ai_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_members_updated_at
  BEFORE UPDATE ON public.tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_tenant_members_user_id ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant_id ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_domain ON public.tenants(domain);
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
