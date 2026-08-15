-- ============ ai_agents ============
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  agent_key text NOT NULL,
  name text NOT NULL,
  description text,
  module text,
  icon text,
  system_prompt text,
  model text,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agents_select_tenant" ON public.ai_agents FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.is_tenant_member(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "ai_agents_admin_manage" ON public.ai_agents FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid())))
  WITH CHECK (tenant_id IS NOT NULL AND (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid())));

-- ============ ai_agent_runs ============
CREATE TABLE public.ai_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_key text NOT NULL,
  instruction text NOT NULL,
  module text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_record_type text,
  related_record_id uuid,
  status text NOT NULL DEFAULT 'queued',
  result_text text,
  result_data jsonb,
  deliverable_id uuid,
  error text,
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  duration_ms integer,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_runs TO authenticated;
GRANT ALL ON public.ai_agent_runs TO service_role;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agent_runs_select" ON public.ai_agent_runs FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "ai_agent_runs_insert" ON public.ai_agent_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id) AND created_by = auth.uid());
CREATE POLICY "ai_agent_runs_update" ON public.ai_agent_runs FOR UPDATE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) AND (created_by = auth.uid() OR public.is_tenant_admin(auth.uid(), tenant_id)))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "ai_agent_runs_delete" ON public.ai_agent_runs FOR DELETE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) AND (created_by = auth.uid() OR public.is_tenant_admin(auth.uid(), tenant_id)));

CREATE INDEX idx_ai_agent_runs_tenant ON public.ai_agent_runs (tenant_id, created_at DESC);
CREATE INDEX idx_ai_agent_runs_agent ON public.ai_agent_runs (tenant_id, agent_key);

-- ============ ai_agent_run_steps ============
CREATE TABLE public.ai_agent_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES public.ai_agent_runs(id) ON DELETE CASCADE,
  step_index integer NOT NULL DEFAULT 0,
  step_type text NOT NULL DEFAULT 'tool',
  label text,
  tool_name text,
  input jsonb,
  output jsonb,
  status text NOT NULL DEFAULT 'done',
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_agent_run_steps TO authenticated;
GRANT ALL ON public.ai_agent_run_steps TO service_role;
ALTER TABLE public.ai_agent_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agent_run_steps_select" ON public.ai_agent_run_steps FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "ai_agent_run_steps_insert" ON public.ai_agent_run_steps FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

CREATE INDEX idx_ai_agent_run_steps_run ON public.ai_agent_run_steps (run_id, step_index);

-- ============ ai_deliverables ============
CREATE TABLE public.ai_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  run_id uuid REFERENCES public.ai_agent_runs(id) ON DELETE SET NULL,
  agent_key text,
  title text NOT NULL,
  deliverable_type text NOT NULL DEFAULT 'document',
  module text,
  summary text,
  body_html text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES public.ai_deliverables(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  related_record_type text,
  related_record_id uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_deliverables TO authenticated;
GRANT ALL ON public.ai_deliverables TO service_role;
ALTER TABLE public.ai_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_deliverables_select" ON public.ai_deliverables FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "ai_deliverables_insert" ON public.ai_deliverables FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id) AND created_by = auth.uid());
CREATE POLICY "ai_deliverables_update" ON public.ai_deliverables FOR UPDATE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) AND (created_by = auth.uid() OR public.is_tenant_admin(auth.uid(), tenant_id)))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "ai_deliverables_delete" ON public.ai_deliverables FOR DELETE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) AND (created_by = auth.uid() OR public.is_tenant_admin(auth.uid(), tenant_id)));

CREATE INDEX idx_ai_deliverables_tenant ON public.ai_deliverables (tenant_id, created_at DESC);

-- ============ ai_agent_schedules ============
CREATE TABLE public.ai_agent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_key text NOT NULL,
  name text NOT NULL,
  instruction text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'cron',
  cron_expression text,
  event_key text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_schedules TO authenticated;
GRANT ALL ON public.ai_agent_schedules TO service_role;
ALTER TABLE public.ai_agent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agent_schedules_select" ON public.ai_agent_schedules FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "ai_agent_schedules_manage" ON public.ai_agent_schedules FOR ALL TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) AND (created_by = auth.uid() OR public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_platform_admin(auth.uid())))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

-- ============ updated_at triggers ============
CREATE TRIGGER trg_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_agent_runs_updated_at BEFORE UPDATE ON public.ai_agent_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_deliverables_updated_at BEFORE UPDATE ON public.ai_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_agent_schedules_updated_at BEFORE UPDATE ON public.ai_agent_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();