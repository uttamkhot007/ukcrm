import { callAI, json, parseJson, preflight } from "../_shared/ai.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Phase = { name: string; description?: string; duration_weeks?: number; deliverables?: string[] };
type Task = { title: string; description?: string; phase?: string; estimated_hours?: number; priority?: string };

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { projectId } = await req.json().catch(() => ({}));
    if (!projectId) return json({ error: "Missing projectId" }, 400);
    if (!SERVICE_ROLE) return json({ error: "Server not configured" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, name, description, project_type, project_category, start_date, end_date, duration_weeks, scope_inclusions, scope_exclusions")
      .eq("id", projectId)
      .maybeSingle();
    if (pErr) return json({ error: pErr.message }, 400);
    if (!project) return json({ error: "Project not found" }, 404);

    const { text, error } = await callAI(
      [
        {
          role: "system",
          content:
            "You are a delivery manager for cybersecurity implementation projects. Produce an execution plan. " +
            'Reply with JSON only: {"summary":"","phases":[{"name":"","description":"","duration_weeks":1,"deliverables":[""]}],' +
            '"tasks":[{"title":"","description":"","phase":"","estimated_hours":8,"priority":"high|medium|low"}],' +
            '"risks":[""],"success_criteria":[""]}. Max 6 phases and 20 tasks.',
        },
        { role: "user", content: JSON.stringify(project) },
      ],
      { jsonMode: true },
    );

    if (error) return json({ error });
    const plan = parseJson<{ phases?: Phase[]; tasks?: Task[] }>(text ?? "");
    if (!plan) return json({ error: "Could not parse AI response" });

    const phases = (plan.phases ?? []).slice(0, 6);
    const phaseIdByName = new Map<string, string>();

    for (const [i, ph] of phases.entries()) {
      const { data: inserted } = await admin
        .from("project_phases")
        .insert({
          project_id: projectId,
          phase_number: i + 1,
          name: ph.name,
          description: ph.description ?? null,
          duration_weeks: ph.duration_weeks ?? null,
          status: "not_started",
          progress: 0,
          deliverables: ph.deliverables ?? [],
        })
        .select("id")
        .maybeSingle();
      if (inserted?.id) phaseIdByName.set(ph.name, inserted.id);
    }

    const tasks = (plan.tasks ?? []).slice(0, 20).map((t) => ({
      project_id: projectId,
      phase_id: t.phase ? phaseIdByName.get(t.phase) ?? null : null,
      title: t.title,
      description: t.description ?? null,
      status: "todo",
      priority: t.priority ?? "medium",
      estimated_hours: t.estimated_hours ?? null,
    }));
    if (tasks.length) await admin.from("project_tasks").insert(tasks);

    await admin.from("projects").update({ ai_enriched_plan: plan }).eq("id", projectId);

    return json({ success: true, phases: phases.length, tasks: tasks.length, plan });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
