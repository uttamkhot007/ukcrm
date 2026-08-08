import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";

const DAY = 86400000;
const iso = (d: Date) => d.toISOString();
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

export type TenantPerson = {
  user_id: string;
  full_name: string;
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
};

export type PulseCheckin = {
  id: string;
  user_id: string;
  checkin_date: string;
  mood_score: number;
  energy_level: number | null;
  workload_level: number | null;
  note: string | null;
};

export type WellbeingSignal = {
  user_id: string;
  signal_date: string;
  risk_score: number;
  risk_level: string;
  sentiment_score: number | null;
  factors: Record<string, number>;
  themes: string[];
  summary: string | null;
  recommended_action: string | null;
};

export type Kudos = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  category: string;
  message: string;
  points: number;
  created_at: string;
};

export type Commitment = {
  id: string;
  owner_id: string;
  created_by: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  priority: string;
  completed_at: string | null;
};

/** Everyone in the current workspace, keyed for fast lookup. */
export function useTenantPeople() {
  const { currentTenant } = useTenant();
  const query = useQuery({
    queryKey: ["people-intel", "people", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TenantPerson[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department, designation, avatar_url")
        .eq("tenant_id", currentTenant!.id)
        .not("user_id", "is", null);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        user_id: p.user_id as string,
        full_name: p.full_name ?? "Unnamed",
        department: p.department ?? null,
        designation: (p as { designation?: string | null }).designation ?? null,
        avatar_url: p.avatar_url ?? null,
      }));
    },
  });

  const byId = useMemo(() => {
    const m = new Map<string, TenantPerson>();
    for (const p of query.data ?? []) m.set(p.user_id, p);
    return m;
  }, [query.data]);

  return { ...query, people: query.data ?? [], byId };
}

/** The signed-in user's check-in for today, plus a save mutation. */
export function useMyPulseToday() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = dateOnly(new Date());

  const query = useQuery({
    queryKey: ["people-intel", "my-pulse", currentTenant?.id, user?.id, today],
    enabled: !!currentTenant?.id && !!user?.id,
    queryFn: async (): Promise<PulseCheckin | null> => {
      const { data, error } = await supabase
        .from("employee_pulse_checkins")
        .select("id, user_id, checkin_date, mood_score, energy_level, workload_level, note")
        .eq("user_id", user!.id)
        .eq("checkin_date", today)
        .maybeSingle();
      if (error) throw error;
      return (data as PulseCheckin) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (input: {
      mood_score: number;
      energy_level: number;
      workload_level: number;
      note: string;
    }) => {
      if (!currentTenant?.id || !user?.id) throw new Error("No active workspace");
      const { error } = await supabase.from("employee_pulse_checkins").upsert(
        {
          tenant_id: currentTenant.id,
          user_id: user.id,
          checkin_date: today,
          mood_score: input.mood_score,
          energy_level: input.energy_level,
          workload_level: input.workload_level,
          note: input.note.trim() || null,
        },
        { onConflict: "user_id,checkin_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people-intel"] });
    },
  });

  return { ...query, checkin: query.data ?? null, save };
}

/** Workspace-wide pulse history for trends. */
export function usePulseHistory(days = 30) {
  const { currentTenant } = useTenant();
  return useQuery({
    queryKey: ["people-intel", "pulse-history", currentTenant?.id, days],
    enabled: !!currentTenant?.id,
    queryFn: async (): Promise<PulseCheckin[]> => {
      const { data, error } = await supabase
        .from("employee_pulse_checkins")
        .select("id, user_id, checkin_date, mood_score, energy_level, workload_level, note")
        .eq("tenant_id", currentTenant!.id)
        .gte("checkin_date", dateOnly(new Date(Date.now() - days * DAY)))
        .order("checkin_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PulseCheckin[];
    },
  });
}

/** Latest AI + behavioural wellbeing signal per person. */
export function useWellbeingSignals(days = 14) {
  const { currentTenant } = useTenant();
  return useQuery({
    queryKey: ["people-intel", "wellbeing", currentTenant?.id, days],
    enabled: !!currentTenant?.id,
    queryFn: async (): Promise<WellbeingSignal[]> => {
      const { data, error } = await supabase
        .from("employee_wellbeing_signals")
        .select(
          "user_id, signal_date, risk_score, risk_level, sentiment_score, factors, themes, summary, recommended_action",
        )
        .eq("tenant_id", currentTenant!.id)
        .gte("signal_date", dateOnly(new Date(Date.now() - days * DAY)))
        .order("signal_date", { ascending: false });
      if (error) throw error;
      const latest = new Map<string, WellbeingSignal>();
      for (const row of (data ?? []) as unknown as WellbeingSignal[]) {
        if (!latest.has(row.user_id)) latest.set(row.user_id, row);
      }
      return [...latest.values()].sort((a, b) => b.risk_score - a.risk_score);
    },
  });
}

export function useRunWellbeingAnalysis() {
  const { currentTenant } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("No active workspace");
      const { data, error } = await supabase.functions.invoke("people-intelligence-analyze", {
        body: { tenant_id: currentTenant.id },
      });
      if (error) throw error;
      return data as { analyzed: number; ai_enriched: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people-intel", "wellbeing"] }),
  });
}

/** Recognition feed with reactions. */
export function useKudosFeed(limit = 40) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["people-intel", "kudos", currentTenant?.id, limit],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_kudos")
        .select("id, from_user_id, to_user_id, category, message, points, created_at")
        .eq("tenant_id", currentTenant!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const kudos = (data ?? []) as Kudos[];
      if (!kudos.length) return { kudos, reactions: [] as { kudos_id: string; user_id: string; emoji: string }[] };
      const { data: reactions, error: rErr } = await supabase
        .from("employee_kudos_reactions")
        .select("kudos_id, user_id, emoji")
        .in("kudos_id", kudos.map((k) => k.id));
      if (rErr) throw rErr;
      return { kudos, reactions: (reactions ?? []) as { kudos_id: string; user_id: string; emoji: string }[] };
    },
  });

  const give = useMutation({
    mutationFn: async (input: { to_user_id: string; category: string; message: string }) => {
      if (!currentTenant?.id || !user?.id) throw new Error("No active workspace");
      const { error } = await supabase.from("employee_kudos").insert({
        tenant_id: currentTenant.id,
        from_user_id: user.id,
        to_user_id: input.to_user_id,
        category: input.category,
        message: input.message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people-intel", "kudos"] }),
  });

  const toggleReaction = useMutation({
    mutationFn: async (input: { kudos_id: string; emoji: string; active: boolean }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (input.active) {
        const { error } = await supabase
          .from("employee_kudos_reactions")
          .delete()
          .eq("kudos_id", input.kudos_id)
          .eq("user_id", user.id)
          .eq("emoji", input.emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employee_kudos_reactions")
          .insert({ kudos_id: input.kudos_id, user_id: user.id, emoji: input.emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people-intel", "kudos"] }),
  });

  return { ...query, give, toggleReaction };
}

/** Explicit "who owes what" commitments. */
export function useCommitments() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["people-intel", "commitments", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async (): Promise<Commitment[]> => {
      const { data, error } = await supabase
        .from("accountability_commitments")
        .select("id, owner_id, created_by, title, description, due_date, status, priority, completed_at")
        .eq("tenant_id", currentTenant!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Commitment[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      owner_id: string;
      title: string;
      description: string;
      due_date: string;
      priority: string;
    }) => {
      if (!currentTenant?.id || !user?.id) throw new Error("No active workspace");
      const { error } = await supabase.from("accountability_commitments").insert({
        tenant_id: currentTenant.id,
        created_by: user.id,
        owner_id: input.owner_id,
        title: input.title.trim(),
        description: input.description.trim() || null,
        due_date: input.due_date,
        priority: input.priority,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people-intel", "commitments"] }),
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await supabase
        .from("accountability_commitments")
        .update({
          status: input.status,
          completed_at: input.status === "done" ? iso(new Date()) : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people-intel", "commitments"] }),
  });

  return { ...query, commitments: query.data ?? [], create, setStatus };
}

export type ProductivityRow = {
  user_id: string;
  activities: number;
  activityMinutes: number;
  tasksCompleted: number;
  tasksOverdue: number;
  ticketsResolved: number;
  dealsWon: number;
  pipelineValue: number;
  daysPresent: number;
  score: number;
};

/** Per-person output pulled live from activities, tasks, tickets, deals and attendance. */
export function useProductivityCockpit(days = 30) {
  const { currentTenant } = useTenant();
  return useQuery({
    queryKey: ["people-intel", "productivity", currentTenant?.id, days],
    enabled: !!currentTenant?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ProductivityRow[]> => {
      const tenantId = currentTenant!.id;
      const sinceTs = iso(new Date(Date.now() - days * DAY));
      const sinceDate = dateOnly(new Date(Date.now() - days * DAY));
      const today = dateOnly(new Date());

      const { data: projectRows } = await supabase.from("projects").select("id").eq("tenant_id", tenantId);
      const projectIds = (projectRows ?? []).map((p) => p.id as string);

      const [activities, tickets, deals, attendance, tasks] = await Promise.all([
        supabase
          .from("daily_activities")
          .select("user_id, duration_minutes")
          .eq("tenant_id", tenantId)
          .gte("activity_date", sinceDate),
        supabase
          .from("customer_support_tickets")
          .select("assigned_to, status, updated_at")
          .eq("tenant_id", tenantId)
          .gte("updated_at", sinceTs),
        supabase
          .from("deals")
          .select("assigned_to, user_id, stage, value, updated_at")
          .eq("tenant_id", tenantId),
        supabase.from("attendance").select("user_id, check_in").eq("tenant_id", tenantId).gte("check_in", sinceTs),
        projectIds.length
          ? supabase
              .from("project_tasks")
              .select("assigned_to, status, due_date, completed_at")
              .in("project_id", projectIds)
          : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      ]);

      const rows = new Map<string, ProductivityRow>();
      const row = (id: string | null | undefined) => {
        if (!id) return null;
        if (!rows.has(id)) {
          rows.set(id, {
            user_id: id,
            activities: 0,
            activityMinutes: 0,
            tasksCompleted: 0,
            tasksOverdue: 0,
            ticketsResolved: 0,
            dealsWon: 0,
            pipelineValue: 0,
            daysPresent: 0,
            score: 0,
          });
        }
        return rows.get(id)!;
      };

      for (const a of activities.data ?? []) {
        const r = row(a.user_id as string);
        if (!r) continue;
        r.activities += 1;
        r.activityMinutes += Number(a.duration_minutes ?? 0);
      }

      for (const t of tickets.data ?? []) {
        const r = row(t.assigned_to as string);
        if (!r) continue;
        if (t.status === "resolved" || t.status === "closed") r.ticketsResolved += 1;
      }

      for (const d of deals.data ?? []) {
        const r = row((d.assigned_to as string) ?? (d.user_id as string));
        if (!r) continue;
        if (d.stage === "closed_won") {
          if (String(d.updated_at ?? "") >= sinceTs) r.dealsWon += 1;
        } else if (d.stage !== "closed_lost") {
          r.pipelineValue += Number(d.value ?? 0);
        }
      }

      const seenDays = new Map<string, Set<string>>();
      for (const a of attendance.data ?? []) {
        const uid = a.user_id as string;
        const r = row(uid);
        if (!r || !a.check_in) continue;
        const day = String(a.check_in).slice(0, 10);
        if (!seenDays.has(uid)) seenDays.set(uid, new Set());
        seenDays.get(uid)!.add(day);
      }
      for (const [uid, set] of seenDays) {
        const r = row(uid);
        if (r) r.daysPresent = set.size;
      }

      for (const t of (tasks.data ?? []) as Record<string, unknown>[]) {
        const r = row(t.assigned_to as string);
        if (!r) continue;
        const status = String(t.status ?? "");
        const isDone = status === "completed" || status === "done";
        if (isDone) {
          if (!t.completed_at || String(t.completed_at) >= sinceTs) r.tasksCompleted += 1;
        } else if (t.due_date && String(t.due_date) < today) {
          r.tasksOverdue += 1;
        }
      }

      for (const r of rows.values()) {
        r.score = Math.max(
          0,
          Math.round(
            r.tasksCompleted * 6 +
              r.ticketsResolved * 5 +
              r.dealsWon * 15 +
              r.activities * 1.5 +
              r.daysPresent * 1 -
              r.tasksOverdue * 4,
          ),
        );
      }

      return [...rows.values()].sort((a, b) => b.score - a.score);
    },
  });
}
