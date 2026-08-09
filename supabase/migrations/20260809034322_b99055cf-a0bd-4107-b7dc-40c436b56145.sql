CREATE TABLE public.template_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('role','team')),
  subject_value TEXT NOT NULL,
  pack_role TEXT NOT NULL DEFAULT 'all',
  solution TEXT NOT NULL DEFAULT 'all',
  can_install BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, subject_type, subject_value, pack_role, solution)
);

CREATE INDEX idx_template_permissions_tenant ON public.template_permissions(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_permissions TO authenticated;
GRANT ALL ON public.template_permissions TO service_role;

ALTER TABLE public.template_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view template permissions"
ON public.template_permissions FOR SELECT TO authenticated
USING (public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins manage template permissions"
ON public.template_permissions FOR ALL TO authenticated
USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER update_template_permissions_updated_at
BEFORE UPDATE ON public.template_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();