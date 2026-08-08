ALTER TABLE public.document_templates
  DROP CONSTRAINT IF EXISTS document_templates_template_type_check;

ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS library_key text,
  ADD COLUMN IF NOT EXISTS library_version text,
  ADD COLUMN IF NOT EXISTS pack_role text;

CREATE INDEX IF NOT EXISTS idx_document_templates_library_key
  ON public.document_templates (tenant_id, library_key);

CREATE TABLE IF NOT EXISTS public.document_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT '1.0',
  library_key text,
  library_version text,
  name text NOT NULL,
  description text,
  template_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  header_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  footer_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dtv_template ON public.document_template_versions (template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dtv_tenant ON public.document_template_versions (tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_template_versions TO authenticated;
GRANT ALL ON public.document_template_versions TO service_role;
ALTER TABLE public.document_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins full access on document_template_versions"
  ON public.document_template_versions FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant members view template versions"
  ON public.document_template_versions FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE POLICY "Tenant members create template versions"
  ON public.document_template_versions FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE POLICY "Tenant members delete template versions"
  ON public.document_template_versions FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE TABLE IF NOT EXISTS public.template_pack_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pack_role text NOT NULL,
  pack_version text NOT NULL,
  previous_version text,
  action text NOT NULL DEFAULT 'install',
  template_count integer NOT NULL DEFAULT 0,
  created_template_ids uuid[] NOT NULL DEFAULT '{}',
  snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_rolled_back boolean NOT NULL DEFAULT false,
  installed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tpi_tenant_role ON public.template_pack_installations (tenant_id, pack_role, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_pack_installations TO authenticated;
GRANT ALL ON public.template_pack_installations TO service_role;
ALTER TABLE public.template_pack_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins full access on template_pack_installations"
  ON public.template_pack_installations FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant members view pack installations"
  ON public.template_pack_installations FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE POLICY "Tenant members create pack installations"
  ON public.template_pack_installations FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE POLICY "Tenant members update pack installations"
  ON public.template_pack_installations FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));