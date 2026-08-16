/**
 * Phase C — Delivery & Support SLA Intelligence
 *
 * Deterministic (non-AI) scoring engines used by the Projects and Support
 * intelligence dashboards. Pure functions only: no network, no tenant access.
 * All callers are responsible for passing tenant-scoped rows.
 */

export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface RiskDriver {
  label: string;
  detail: string;
  weight: number;
}

export interface ProjectRiskResult {
  projectId: string;
  name: string;
  status: string | null;
  score: number;
  level: RiskLevel;
  drivers: RiskDriver[];
  actions: string[];
  daysToDeadline: number | null;
  progress: number;
  expectedProgress: number | null;
  budgetBurn: number | null;
  overdueTasks: number;
  openTasks: number;
  slippedMilestones: number;
}

export interface TicketSlaResult {
  ticketId: string;
  ticketNumber: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  assignedTo: string | null;
  score: number;
  level: RiskLevel;
  breached: boolean;
  hoursToBreach: number | null;
  ageHours: number;
  drivers: RiskDriver[];
  action: string;
}

export interface SlaTrendPoint {
  period: string;
  created: number;
  resolved: number;
  compliance: number | null;
  mttrHours: number | null;
  breaches: number;
}

export interface DeliveryTrendPoint {
  period: string;
  completed: number;
  overdue: number;
  onTimeRate: number | null;
}

const CLOSED_TICKET_STATES = ["resolved", "closed", "cancelled"];
const CLOSED_PROJECT_STATES = ["completed", "cancelled"];
const DONE_TASK_STATES = ["done", "completed", "closed", "cancelled"];

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 4,
};

const MS_HOUR = 1000 * 60 * 60;
const MS_DAY = MS_HOUR * 24;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hoursBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / MS_HOUR;
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / MS_DAY;
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 22) return "medium";
  return "low";
}

export function riskLevelClass(level: RiskLevel): string {
  switch (level) {
    case "critical":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "high":
      return "bg-orange-500/15 text-orange-500 border-orange-500/30";
    case "medium":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    default:
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  }
}

/* ------------------------------------------------------------------ */
/* Project delivery risk                                               */
/* ------------------------------------------------------------------ */

export function scoreProjectRisk(
  project: any,
  tasks: any[] = [],
  milestones: any[] = [],
  now: Date = new Date(),
): ProjectRiskResult {
  const drivers: RiskDriver[] = [];
  const actions: string[] = [];

  const start = toDate(project.actual_start_date) ?? toDate(project.start_date);
  const end = toDate(project.end_date);
  const progress = Number(project.progress ?? 0);
  const budget = Number(project.budget ?? 0);
  const spent = Number(project.spent_amount ?? 0);
  const budgetBurn = budget > 0 ? (spent / budget) * 100 : null;
  const daysToDeadline = end ? Math.round(daysBetween(end, now)) : null;

  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const openTasks = projectTasks.filter((t) => !DONE_TASK_STATES.includes(String(t.status))).length;
  const overdueTasks = projectTasks.filter((t) => {
    const due = toDate(t.due_date);
    return !!due && due < now && !DONE_TASK_STATES.includes(String(t.status));
  }).length;
  const unassignedOpen = projectTasks.filter(
    (t) => !t.assigned_to && !DONE_TASK_STATES.includes(String(t.status)),
  ).length;

  const projectMilestones = milestones.filter((m) => m.project_id === project.id);
  const slippedMilestones = projectMilestones.filter((m) => {
    const due = toDate(m.due_date);
    if (!due) return false;
    if (m.completed_at) return toDate(m.completed_at)! > due;
    return due < now && String(m.status) !== "completed";
  }).length;

  // Expected progress from elapsed schedule
  let expectedProgress: number | null = null;
  if (start && end && end > start) {
    const total = daysBetween(end, start);
    const elapsed = daysBetween(now, start);
    expectedProgress = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  }

  const closed = CLOSED_PROJECT_STATES.includes(String(project.status));
  if (closed) {
    return {
      projectId: project.id,
      name: project.name,
      status: project.status ?? null,
      score: 0,
      level: "low",
      drivers: [],
      actions: [],
      daysToDeadline,
      progress,
      expectedProgress,
      budgetBurn,
      overdueTasks,
      openTasks,
      slippedMilestones,
    };
  }

  let score = 0;

  if (expectedProgress !== null) {
    const gap = expectedProgress - progress;
    if (gap >= 10) {
      const weight = Math.min(30, Math.round(gap * 0.8));
      score += weight;
      drivers.push({
        label: "Schedule slippage",
        detail: `${progress}% complete vs ${expectedProgress}% expected (${gap} pt gap)`,
        weight,
      });
      actions.push("Re-baseline the plan or add capacity to recover the schedule gap.");
    }
  }

  if (daysToDeadline !== null && daysToDeadline < 0) {
    const weight = Math.min(30, 15 + Math.abs(daysToDeadline));
    score += weight;
    drivers.push({
      label: "Past due",
      detail: `Deadline passed ${Math.abs(daysToDeadline)} day(s) ago`,
      weight,
    });
    actions.push("Agree a revised end date with the client and update the project record.");
  } else if (daysToDeadline !== null && daysToDeadline <= 14 && progress < 80) {
    const weight = 14;
    score += weight;
    drivers.push({
      label: "Tight landing",
      detail: `${daysToDeadline} day(s) left at ${progress}% completion`,
      weight,
    });
    actions.push("Run a scope-cut review to protect the delivery date.");
  }

  if (budgetBurn !== null && budgetBurn - progress >= 15) {
    const weight = Math.min(25, Math.round((budgetBurn - progress) * 0.6));
    score += weight;
    drivers.push({
      label: "Budget overburn",
      detail: `${Math.round(budgetBurn)}% budget consumed at ${progress}% progress`,
      weight,
    });
    actions.push("Review cost drivers and raise a change request before further spend.");
  }

  if (overdueTasks > 0) {
    const weight = Math.min(20, overdueTasks * 4);
    score += weight;
    drivers.push({
      label: "Overdue tasks",
      detail: `${overdueTasks} of ${openTasks || overdueTasks} open task(s) past due`,
      weight,
    });
    actions.push(`Clear ${overdueTasks} overdue task(s) in the next stand-up.`);
  }

  if (slippedMilestones > 0) {
    const weight = Math.min(18, slippedMilestones * 6);
    score += weight;
    drivers.push({
      label: "Milestone slippage",
      detail: `${slippedMilestones} milestone(s) missed or late`,
      weight,
    });
    actions.push("Reforecast downstream milestones and notify stakeholders.");
  }

  if (unassignedOpen > 0) {
    const weight = Math.min(12, unassignedOpen * 3);
    score += weight;
    drivers.push({
      label: "Unowned work",
      detail: `${unassignedOpen} open task(s) with no assignee`,
      weight,
    });
    actions.push("Assign owners to unallocated tasks.");
  }

  if (!project.project_manager_id) {
    score += 8;
    drivers.push({ label: "No project manager", detail: "Project has no assigned manager", weight: 8 });
    actions.push("Assign a project manager to restore accountability.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    projectId: project.id,
    name: project.name,
    status: project.status ?? null,
    score,
    level: levelFromScore(score),
    drivers: drivers.sort((a, b) => b.weight - a.weight),
    actions,
    daysToDeadline,
    progress,
    expectedProgress,
    budgetBurn,
    overdueTasks,
    openTasks,
    slippedMilestones,
  };
}

export function rankProjectRisks(
  projects: any[],
  tasks: any[],
  milestones: any[],
  now: Date = new Date(),
): ProjectRiskResult[] {
  return projects
    .map((p) => scoreProjectRisk(p, tasks, milestones, now))
    .filter((r) => !CLOSED_PROJECT_STATES.includes(String(r.status)))
    .sort((a, b) => b.score - a.score);
}

/** Monthly on-time delivery trend derived from milestone completions. */
export function buildDeliveryTrend(
  milestones: any[],
  months = 6,
  now: Date = new Date(),
): DeliveryTrendPoint[] {
  const buckets: DeliveryTrendPoint[] = [];
  const keys: string[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    keys.push(key);
    buckets.push({
      period: d.toLocaleDateString(undefined, { month: "short" }),
      completed: 0,
      overdue: 0,
      onTimeRate: null,
    });
  }

  for (const m of milestones) {
    const completed = toDate(m.completed_at);
    const due = toDate(m.due_date);
    if (!completed) continue;
    const key = `${completed.getFullYear()}-${String(completed.getMonth() + 1).padStart(2, "0")}`;
    const idx = keys.indexOf(key);
    if (idx === -1) continue;
    buckets[idx].completed += 1;
    if (due && completed > due) buckets[idx].overdue += 1;
  }

  return buckets.map((b) => ({
    ...b,
    onTimeRate: b.completed > 0 ? Math.round(((b.completed - b.overdue) / b.completed) * 100) : null,
  }));
}

/* ------------------------------------------------------------------ */
/* Support SLA risk                                                    */
/* ------------------------------------------------------------------ */

export function scoreTicketSla(ticket: any, now: Date = new Date()): TicketSlaResult {
  const drivers: RiskDriver[] = [];
  const created = toDate(ticket.created_at) ?? now;
  const deadline = toDate(ticket.sla_deadline);
  const isClosed = CLOSED_TICKET_STATES.includes(String(ticket.status));
  const ageHours = Math.max(0, hoursBetween(now, created));
  const hoursToBreach = deadline ? hoursBetween(deadline, now) : null;
  const breached = !isClosed && hoursToBreach !== null && hoursToBreach < 0;

  if (isClosed) {
    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number ?? null,
      title: ticket.title ?? null,
      severity: ticket.severity ?? null,
      status: ticket.status ?? null,
      assignedTo: ticket.assigned_to ?? null,
      score: 0,
      level: "low",
      breached: false,
      hoursToBreach,
      ageHours,
      drivers: [],
      action: "No action — ticket closed.",
    };
  }

  let score = 0;

  const sevWeight = SEVERITY_WEIGHT[String(ticket.severity)] ?? 8;
  score += sevWeight;
  drivers.push({
    label: "Severity",
    detail: `${ticket.severity ?? "unspecified"} impact`,
    weight: sevWeight,
  });

  if (breached) {
    const overdueHours = Math.abs(hoursToBreach!);
    const weight = Math.min(45, 25 + Math.round(overdueHours / 4));
    score += weight;
    drivers.push({
      label: "SLA breached",
      detail: `Past deadline by ${formatHours(overdueHours)}`,
      weight,
    });
  } else if (hoursToBreach !== null && hoursToBreach <= 24) {
    const weight = hoursToBreach <= 4 ? 30 : hoursToBreach <= 8 ? 22 : 14;
    score += weight;
    drivers.push({
      label: "SLA at risk",
      detail: `${formatHours(hoursToBreach)} left to deadline`,
      weight,
    });
  } else if (hoursToBreach === null) {
    score += 10;
    drivers.push({ label: "No SLA target", detail: "Ticket has no SLA deadline set", weight: 10 });
  }

  if (!ticket.assigned_to && !ticket.assigned_team) {
    score += 15;
    drivers.push({ label: "Unassigned", detail: "No owner or team on the ticket", weight: 15 });
  }

  if (String(ticket.status) === "open" && ageHours > 24) {
    const weight = Math.min(15, Math.round(ageHours / 24) * 5);
    score += weight;
    drivers.push({
      label: "Stalled",
      detail: `Still open after ${formatHours(ageHours)}`,
      weight,
    });
  }

  if (String(ticket.impact) === "high" || String(ticket.impact) === "critical") {
    score += 8;
    drivers.push({ label: "Business impact", detail: `Impact recorded as ${ticket.impact}`, weight: 8 });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = levelFromScore(score);

  return {
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number ?? null,
    title: ticket.title ?? null,
    severity: ticket.severity ?? null,
    status: ticket.status ?? null,
    assignedTo: ticket.assigned_to ?? null,
    score,
    level,
    breached,
    hoursToBreach,
    ageHours,
    drivers: drivers.sort((a, b) => b.weight - a.weight),
    action: recommendTicketAction({ breached, hoursToBreach, ticket, level }),
  };
}

function recommendTicketAction(args: {
  breached: boolean;
  hoursToBreach: number | null;
  ticket: any;
  level: RiskLevel;
}): string {
  const { breached, hoursToBreach, ticket, level } = args;
  if (breached) return "Escalate now and send the customer a recovery update with a committed ETA.";
  if (!ticket.assigned_to && !ticket.assigned_team) return "Assign an owner immediately — nobody is working this ticket.";
  if (hoursToBreach !== null && hoursToBreach <= 4) return "Work this next: under 4 hours to SLA deadline.";
  if (hoursToBreach === null) return "Set an SLA deadline so this ticket is measurable.";
  if (String(ticket.status) === "open") return "Move to in-progress with a first response to the customer.";
  if (level === "low") return "On track — keep the customer updated at the next checkpoint.";
  return "Review progress and confirm the resolution plan with the assignee.";
}

export function prioritizeTickets(tickets: any[], now: Date = new Date()): TicketSlaResult[] {
  return tickets
    .filter((t) => !CLOSED_TICKET_STATES.includes(String(t.status)))
    .map((t) => scoreTicketSla(t, now))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ah = a.hoursToBreach ?? Number.MAX_SAFE_INTEGER;
      const bh = b.hoursToBreach ?? Number.MAX_SAFE_INTEGER;
      return ah - bh;
    });
}

/** Weekly SLA compliance / MTTR / volume trend. */
export function buildSlaTrend(tickets: any[], weeks = 8, now: Date = new Date()): SlaTrendPoint[] {
  const points: SlaTrendPoint[] = [];
  const starts: Date[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now.getTime() - i * 7 * MS_DAY);
    start.setHours(0, 0, 0, 0);
    starts.push(start);
    points.push({
      period: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      created: 0,
      resolved: 0,
      compliance: null,
      mttrHours: null,
      breaches: 0,
    });
  }

  const resolutionTotals = new Array(weeks).fill(0);

  const bucketOf = (d: Date): number => {
    for (let i = starts.length - 1; i >= 0; i--) {
      if (d >= starts[i] && d < new Date(starts[i].getTime() + 7 * MS_DAY)) return i;
    }
    return -1;
  };

  for (const t of tickets) {
    const created = toDate(t.created_at);
    if (created) {
      const idx = bucketOf(created);
      if (idx >= 0) points[idx].created += 1;
    }

    const resolved = toDate(t.resolved_at);
    if (resolved && created) {
      const idx = bucketOf(resolved);
      if (idx >= 0) {
        points[idx].resolved += 1;
        resolutionTotals[idx] += Math.max(0, hoursBetween(resolved, created));
        const deadline = toDate(t.sla_deadline);
        if (deadline && resolved > deadline) points[idx].breaches += 1;
      }
    }
  }

  return points.map((p, i) => ({
    ...p,
    compliance: p.resolved > 0 ? Math.round(((p.resolved - p.breaches) / p.resolved) * 100) : null,
    mttrHours: p.resolved > 0 ? Math.round((resolutionTotals[i] / p.resolved) * 10) / 10 : null,
  }));
}

export function formatHours(hours: number): string {
  const abs = Math.abs(hours);
  if (abs < 1) return `${Math.round(abs * 60)}m`;
  if (abs < 48) return `${Math.round(abs)}h`;
  return `${Math.round(abs / 24)}d`;
}

export function summarizeSlaHealth(results: TicketSlaResult[]) {
  const breached = results.filter((r) => r.breached).length;
  const atRisk = results.filter((r) => !r.breached && r.hoursToBreach !== null && r.hoursToBreach <= 24).length;
  const unassigned = results.filter((r) => !r.assignedTo).length;
  const critical = results.filter((r) => r.level === "critical").length;
  return { open: results.length, breached, atRisk, unassigned, critical };
}
