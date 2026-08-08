CREATE TABLE IF NOT EXISTS public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  template_name text,
  template_type text,
  title text NOT NULL,
  source_type text,
  source_id uuid,
  ai_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_notes text,
  review_notes text,
  ai_model text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  finalized_by uuid,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_tenant ON public.generated_documents (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_documents TO authenticated;
GRANT ALL ON public.generated_documents TO service_role;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins full access on generated_documents"
  ON public.generated_documents FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant members view generated documents"
  ON public.generated_documents FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE POLICY "Tenant members create generated documents"
  ON public.generated_documents FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE POLICY "Tenant members update generated documents"
  ON public.generated_documents FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE POLICY "Tenant members delete generated documents"
  ON public.generated_documents FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members
    WHERE tenant_members.user_id = auth.uid() AND tenant_members.status = 'active'));

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();