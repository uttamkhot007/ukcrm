-- helper: can the current user see other people's wellbeing data in this tenant
CREATE OR REPLACE FUNCTION public.can_view_people_intelligence(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_tenant_access(_user_id, _tenant_id)
    AND (
      public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'manager')
      OR public.is_management(_user_id)
      OR public.has_team(_user_id, 'hr')
      OR public.is_platform_admin(_user_id)
    )
$$;

-- 1. daily pulse check-ins
CREATE TABLE public.employee_pulse_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  mood_score smallint NOT NULL,
  energy_level smallint,
  workload_level smallint,
  note text,
  ai_sentiment numeric,
  ai_themes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);
CREATE INDEX idx_pulse_tenant_date ON public.employee_pulse_checkins (tenant_id, checkin_date DESC);
CREATE INDEX idx_pulse_user_date ON public.employee_pulse_checkins (user_id, checkin_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_pulse_checkins TO authenticated;
GRANT ALL ON public.employee_pulse_checkins TO service_role;
ALTER TABLE public.employee_pulse_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pulse manage" ON public.employee_pulse_checkins
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "leaders read pulse" ON public.employee_pulse_checkins
  FOR SELECT TO authenticated
  USING (public.can_view_people_intelligence(auth.uid(), tenant_id));

CREATE TRIGGER trg_pulse_updated_at BEFORE UPDATE ON public.employee_pulse_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. wellbeing signals (AI + behavioural)
CREATE TABLE public.employee_wellbeing_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  signal_date date NOT NULL DEFAULT CURRENT_DATE,
  risk_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  sentiment_score numeric,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  themes text[] NOT NULL DEFAULT '{}',
  summary text,
  recommended_action text,
  source text NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, signal_date)
);
CREATE INDEX idx_wellbeing_tenant_date ON public.employee_wellbeing_signals (tenant_id, signal_date DESC);

GRANT SELECT ON public.employee_wellbeing_signals TO authenticated;
GRANT ALL ON public.employee_wellbeing_signals TO service_role;
ALTER TABLE public.employee_wellbeing_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wellbeing read" ON public.employee_wellbeing_signals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "leaders read wellbeing" ON public.employee_wellbeing_signals
  FOR SELECT TO authenticated
  USING (public.can_view_people_intelligence(auth.uid(), tenant_id));

CREATE TRIGGER trg_wellbeing_updated_at BEFORE UPDATE ON public.employee_wellbeing_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. kudos
CREATE TABLE public.employee_kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'teamwork',
  message text NOT NULL,
  points integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kudos_tenant_created ON public.employee_kudos (tenant_id, created_at DESC);
CREATE INDEX idx_kudos_to_user ON public.employee_kudos (to_user_id);

GRANT SELECT, INSERT, DELETE ON public.employee_kudos TO authenticated;
GRANT ALL ON public.employee_kudos TO service_role;
ALTER TABLE public.employee_kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read kudos" ON public.employee_kudos
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "give kudos" ON public.employee_kudos
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid() AND public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "delete own kudos" ON public.employee_kudos
  FOR DELETE TO authenticated
  USING (from_user_id = auth.uid());

-- 4. kudos reactions
CREATE TABLE public.employee_kudos_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kudos_id uuid NOT NULL REFERENCES public.employee_kudos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kudos_id, user_id, emoji)
);
CREATE INDEX idx_kudos_reactions_kudos ON public.employee_kudos_reactions (kudos_id);

GRANT SELECT, INSERT, DELETE ON public.employee_kudos_reactions TO authenticated;
GRANT ALL ON public.employee_kudos_reactions TO service_role;
ALTER TABLE public.employee_kudos_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read reactions" ON public.employee_kudos_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_kudos k
    WHERE k.id = kudos_id AND public.user_has_tenant_access(auth.uid(), k.tenant_id)
  ));

CREATE POLICY "react" ON public.employee_kudos_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.employee_kudos k
    WHERE k.id = kudos_id AND public.user_has_tenant_access(auth.uid(), k.tenant_id)
  ));

CREATE POLICY "unreact" ON public.employee_kudos_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. accountability commitments
CREATE TABLE public.accountability_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  source_module text,
  source_record_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commit_tenant_due ON public.accountability_commitments (tenant_id, due_date);
CREATE INDEX idx_commit_owner ON public.accountability_commitments (owner_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accountability_commitments TO authenticated;
GRANT ALL ON public.accountability_commitments TO service_role;
ALTER TABLE public.accountability_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read commitments" ON public.accountability_commitments
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "create commitments" ON public.accountability_commitments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "update commitments" ON public.accountability_commitments
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.can_view_people_intelligence(auth.uid(), tenant_id));

CREATE POLICY "delete commitments" ON public.accountability_commitments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.can_view_people_intelligence(auth.uid(), tenant_id));

CREATE TRIGGER trg_commit_updated_at BEFORE UPDATE ON public.accountability_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

REVOKE EXECUTE ON FUNCTION public.can_view_people_intelligence(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_people_intelligence(uuid, uuid) TO authenticated, service_role;