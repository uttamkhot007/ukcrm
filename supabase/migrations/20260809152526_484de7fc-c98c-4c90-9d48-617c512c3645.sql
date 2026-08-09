CREATE TABLE public.employee_skill_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_score numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_skill_matrix_tenant ON public.employee_skill_matrix (tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_skill_matrix TO authenticated;
GRANT ALL ON public.employee_skill_matrix TO service_role;

ALTER TABLE public.employee_skill_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view skill matrix"
ON public.employee_skill_matrix FOR SELECT TO authenticated
USING (public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "HR, managers and admins can insert skill matrix"
ON public.employee_skill_matrix FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_any_team(auth.uid(), ARRAY['hr','management']::team_type[])
  )
);

CREATE POLICY "HR, managers and admins can update skill matrix"
ON public.employee_skill_matrix FOR UPDATE TO authenticated
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_any_team(auth.uid(), ARRAY['hr','management']::team_type[])
  )
)
WITH CHECK (public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "HR, managers and admins can delete skill matrix"
ON public.employee_skill_matrix FOR DELETE TO authenticated
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_any_team(auth.uid(), ARRAY['hr','management']::team_type[])
  )
);

CREATE TRIGGER update_employee_skill_matrix_updated_at
BEFORE UPDATE ON public.employee_skill_matrix
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();