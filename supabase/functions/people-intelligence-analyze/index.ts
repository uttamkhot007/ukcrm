import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const DAYS = 14;
const MODEL = "google/gemini-2.5-flash";

type Row = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Deterministic fallback / baseline scoring so the feature never depends on the model. */
function heuristic(p: {
  moods: number[];
  workloads: number[];
  energies: number[];
  overdue: number;
  weekendDays: number;
  longDays: number;
  checkinCount: number;
}) {
  const avg = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0);
  const moodAvg = avg(p.moods); // 1..5
  const workloadAvg = avg(p.workloads); // 1..5
  const energyAvg = avg(p.energies); // 1..5

  const factors: Record<string, number> = {};
  let risk = 0;
  if (p.moods.length) {
    const moodRisk = Math.max(0, (3.2 - moodAvg) / 2.2) * 40;
    factors.low_mood = Math.round(moodRisk);
    risk += moodRisk;
  }
  if (p.energies.length) {
    const energyRisk = Math.max(0, (3 - energyAvg) / 2) * 15;
    factors.low_energy = Math.round(energyRisk);
    risk += energyRisk;
  }
  if (p.workloads.length) {
    const loadRisk = Math.max(0, (workloadAvg - 3.5) / 1.5) * 20;
    factors.heavy_workload = Math.round(loadRisk);
    risk += loadRisk;
  }
  const overdueRisk = Math.min(p.overdue, 10) * 2;
  factors.overdue_items = Math.round(overdueRisk);
  risk += overdueRisk;

  const weekendRisk = Math.min(p.weekendDays, 4) * 4;
  factors.weekend_work = Math.round(weekendRisk);
  risk += weekendRisk;

  const longRisk = Math.min(p.longDays, 6) * 3;
  factors.long_days = Math.round(longRisk);
  risk += longRisk;

  if (p.checkinCount === 0) {
    factors.no_checkins = 8;
    risk += 8;
  }

  const risk_score = Math.max(0, Math.min(100, Math.round(risk)));
  const risk_level = risk_score >= 65 ? "high" : risk_score >= 35 ? "medium" : "low";
  const sentiment_score = p.moods.length ? Number((((moodAvg - 3) / 2)).toFixed(2)) : null;
  return { risk_score, risk_level, sentiment_score, factors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SERVICE_ROLE) return json({ error: "Server not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const tenantId = (body as Row).tenant_id;
    if (!isUuid(tenantId)) return json({ error: "tenant_id must be a valid id" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Only managers / HR / admins of this workspace may run the analysis.
    const { data: allowed, error: permErr } = await admin.rpc("can_view_people_intelligence", {
      _user_id: userId,
      _tenant_id: tenantId,
    });
    if (permErr) return json({ error: "Permission check failed", details: permErr.message }, 500);
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const since = new Date(Date.now() - DAYS * 86400000).toISOString();
    const sinceDate = since.slice(0, 10);

    const [profilesRes, pulseRes, attendanceRes, tasksRes] = await Promise.all([
      admin.from("profiles").select("id, full_name, department, designation").eq("tenant_id", tenantId),
      admin
        .from("employee_pulse_checkins")
        .select("user_id, checkin_date, mood_score, energy_level, workload_level, note")
        .eq("tenant_id", tenantId)
        .gte("checkin_date", sinceDate),
      admin
        .from("attendance")
        .select("user_id, date, check_in_time, check_out_time")
        .eq("tenant_id", tenantId)
        .gte("date", sinceDate),
      admin
        .from("project_tasks")
        .select("assigned_to, status, due_date")
        .eq("tenant_id", tenantId)
        .lt("due_date", new Date().toISOString().slice(0, 10)),
    ]);

    const profiles = (profilesRes.data ?? []) as Row[];
    if (!profiles.length) return json({ analyzed: 0, results: [] });

    const byUser = new Map<string, {
      name: string;
      department: string | null;
      moods: number[];
      workloads: number[];
      energies: number[];
      notes: string[];
      overdue: number;
      weekendDays: number;
      longDays: number;
      checkinCount: number;
    }>();

    for (const p of profiles) {
      byUser.set(p.id as string, {
        name: (p.full_name as string) ?? "Unknown",
        department: (p.department as string) ?? null,
        moods: [],
        workloads: [],
        energies: [],
        notes: [],
        overdue: 0,
        weekendDays: 0,
        longDays: 0,
        checkinCount: 0,
      });
    }

    for (const r of (pulseRes.data ?? []) as Row[]) {
      const e = byUser.get(r.user_id as string);
      if (!e) continue;
      e.checkinCount += 1;
      if (typeof r.mood_score === "number") e.moods.push(r.mood_score);
      if (typeof r.energy_level === "number") e.energies.push(r.energy_level);
      if (typeof r.workload_level === "number") e.workloads.push(r.workload_level);
      if (typeof r.note === "string" && r.note.trim()) e.notes.push(r.note.trim().slice(0, 400));
    }

    for (const r of (attendanceRes.data ?? []) as Row[]) {
      const e = byUser.get(r.user_id as string);
      if (!e) continue;
      const day = new Date(String(r.date));
      const dow = day.getUTCDay();
      if (dow === 0 || dow === 6) e.weekendDays += 1;
      if (r.check_in_time && r.check_out_time) {
        const inMs = new Date(`1970-01-01T${r.check_in_time}Z`).getTime();
        const outMs = new Date(`1970-01-01T${r.check_out_time}Z`).getTime();
        if (outMs - inMs > 10 * 3600000) e.longDays += 1;
      }
    }

    for (const r of (tasksRes.data ?? []) as Row[]) {
      const status = String(r.status ?? "");
      if (status === "completed" || status === "done" || status === "cancelled") continue;
      const e = byUser.get(r.assigned_to as string);
      if (e) e.overdue += 1;
    }

    // Baseline scores for everyone with any signal at all.
    const baseline = [...byUser.entries()]
      .filter(([, e]) => e.checkinCount > 0 || e.overdue > 0 || e.weekendDays > 0 || e.longDays > 0)
      .map(([user_id, e]) => ({ user_id, employee: e, ...heuristic(e) }));

    if (!baseline.length) return json({ analyzed: 0, results: [] });

    // AI enrichment: themes, summary, recommended action from the written notes.
    const enriched = new Map<string, { themes: string[]; summary: string; action: string; sentiment?: number }>();
    const withNotes = baseline.filter((b) => b.employee.notes.length);

    if (LOVABLE_API_KEY && withNotes.length) {
      const payload = withNotes.slice(0, 60).map((b) => ({
        user_id: b.user_id,
        role: b.employee.department ?? "",
        notes: b.employee.notes.slice(-6),
        avg_mood_1_to_5: b.employee.moods.length
          ? Number((b.employee.moods.reduce((s, n) => s + n, 0) / b.employee.moods.length).toFixed(2))
          : null,
        overdue_items: b.employee.overdue,
        weekend_days: b.employee.weekendDays,
        long_days: b.employee.longDays,
      }));

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": LOVABLE_API_KEY,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are an employee-experience analyst. You read short self-reported work check-in notes and workload metrics and report how each person appears to be feeling. Be measured and evidence-based; never diagnose or speculate about health. Reply with JSON only, no prose, no code fences. Shape: {\"people\":[{\"user_id\":string,\"sentiment\":number between -1 and 1,\"themes\":[up to 3 short lowercase phrases],\"summary\":one sentence under 160 characters,\"action\":one concrete manager action under 120 characters}]}",
              },
              { role: "user", content: JSON.stringify({ people: payload }) },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
          const parsed = JSON.parse(String(raw).replace(/^```(?:json)?|```$/g, "").trim());
          for (const p of parsed?.people ?? []) {
            if (!isUuid(p?.user_id)) continue;
            enriched.set(p.user_id, {
              themes: Array.isArray(p.themes) ? p.themes.slice(0, 3).map(String) : [],
              summary: typeof p.summary === "string" ? p.summary.slice(0, 200) : "",
              action: typeof p.action === "string" ? p.action.slice(0, 160) : "",
              sentiment: typeof p.sentiment === "number" ? Math.max(-1, Math.min(1, p.sentiment)) : undefined,
            });
          }
        } else {
          console.error(`AI gateway failed [${aiRes.status}]: ${await aiRes.text()}`);
        }
      } catch (e) {
        console.error("AI enrichment failed", e);
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows = baseline.map((b) => {
      const ai = enriched.get(b.user_id);
      const sentiment = ai?.sentiment ?? b.sentiment_score;
      // Blend written sentiment into the behavioural risk score.
      let risk = b.risk_score;
      if (typeof ai?.sentiment === "number" && ai.sentiment < 0) {
        risk = Math.min(100, Math.round(risk + Math.abs(ai.sentiment) * 20));
      }
      return {
        tenant_id: tenantId,
        user_id: b.user_id,
        signal_date: today,
        risk_score: risk,
        risk_level: risk >= 65 ? "high" : risk >= 35 ? "medium" : "low",
        sentiment_score: sentiment,
        factors: b.factors,
        themes: ai?.themes ?? [],
        summary: ai?.summary || null,
        recommended_action: ai?.action || null,
        source: ai ? "ai" : "behavioural",
      };
    });

    const { error: upsertErr } = await admin
      .from("employee_wellbeing_signals")
      .upsert(rows, { onConflict: "user_id,signal_date" });

    if (upsertErr) {
      console.error("Upsert failed", upsertErr);
      return json({ error: "Could not save wellbeing signals", details: upsertErr.message }, 500);
    }

    return json({ analyzed: rows.length, ai_enriched: enriched.size, results: rows });
  } catch (e) {
    console.error("people-intelligence-analyze error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
