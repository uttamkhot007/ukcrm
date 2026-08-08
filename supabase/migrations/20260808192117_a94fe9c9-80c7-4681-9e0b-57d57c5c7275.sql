CREATE TABLE public.software_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  version text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT '',
  license_type text NOT NULL DEFAULT 'Unknown',
  risk_level text NOT NULL DEFAULT 'critical',
  status text NOT NULL DEFAULT 'review',
  used_in text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.software_dependencies TO authenticated;
GRANT ALL ON public.software_dependencies TO service_role;

ALTER TABLE public.software_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view software dependencies"
  ON public.software_dependencies FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can insert software dependencies"
  ON public.software_dependencies FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can update software dependencies"
  ON public.software_dependencies FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can delete software dependencies"
  ON public.software_dependencies FOR DELETE TO authenticated
  USING (tenant_id IS NULL OR public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE INDEX idx_software_dependencies_tenant_id ON public.software_dependencies(tenant_id);

CREATE TRIGGER update_software_dependencies_updated_at
  BEFORE UPDATE ON public.software_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();