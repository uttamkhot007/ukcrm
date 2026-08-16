/**
 * Phase D — HR Journeys
 *
 * Pure helpers that turn raw HR rows (workflows, leave/travel requests,
 * learning progress, certifications) into journey timelines, health signals
 * and next actions. No network access — callers pass tenant-scoped rows.
 */

import {
  getStagesForWorkflowType,
  formatStageName,
  type WorkflowStage,
} from "@/lib/workflow-templates";

export type JourneyType = "onboarding" | "offboarding" | "retention";
export type StageState = "done" | "current" | "upcoming" | "skipped";

export interface JourneyStep {
  id: string;
  name: string;
  description: string;
  order: number;
  state: StageState;
  estimatedDays?: number;
  /** Projected calendar date this step should be reached by. */
  projectedDate: Date | null;
}

export interface JourneyTimeline {
  workflowId: string;
  title: string;
  type: JourneyType;
  status: string;
  currentStage: string;
  currentStageName: string;
  progress: number;
  steps: JourneyStep[];
  daysInJourney: number;
  daysInCurrentStage: number;
  expectedTotalDays: number;
  stalled: boolean;
  nextStep: JourneyStep | null;
  nextAction: string;
  targetUserId: string | null;
}

const MS_DAY = 1000 * 60 * 60 * 24;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(date: Date | null, now: Date): number {
  if (!date) return 0;
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / MS_DAY));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_DAY);
}

export function buildJourneyTimeline(workflow: any, now: Date = new Date()): JourneyTimeline {
  const type: JourneyType = (workflow.workflow_type as JourneyType) ?? "onboarding";
  const stages: WorkflowStage[] = getStagesForWorkflowType(type);
  const currentStage = String(workflow.current_stage ?? stages[0]?.id ?? "");
  const currentIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === currentStage),
  );
  const isComplete = ["completed", "cancelled", "rejected"].includes(String(workflow.status));

  const started = toDate(workflow.started_at) ?? toDate(workflow.created_at);
  const updated = toDate(workflow.updated_at) ?? started;
  const daysInJourney = daysSince(started, now);
  const daysInCurrentStage = daysSince(updated, now);

  let cursor = started ?? now;
  const steps: JourneyStep[] = stages.map((s, i) => {
    const state: StageState = isComplete
      ? "done"
      : i < currentIndex
        ? "done"
        : i === currentIndex
          ? "current"
          : "upcoming";
    cursor = addDays(cursor, s.estimatedDays ?? 1);
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      order: s.order,
      state,
      estimatedDays: s.estimatedDays,
      projectedDate: new Date(cursor),
    };
  });

  const expectedTotalDays = stages.reduce((sum, s) => sum + (s.estimatedDays ?? 1), 0);
  const currentStageBudget = stages[currentIndex]?.estimatedDays ?? 3;
  const stalled = !isComplete && daysInCurrentStage > currentStageBudget * 2;
  const nextStep = steps[currentIndex + 1] ?? null;
  const progress = isComplete
    ? 100
    : Math.round((currentIndex / Math.max(1, stages.length - 1)) * 100);

  let nextAction: string;
  if (isComplete) {
    nextAction = "Journey complete — archive and capture learnings.";
  } else if (stalled) {
    nextAction = `Stalled ${daysInCurrentStage} days at "${formatStageName(currentStage)}" — escalate to the stage owner today.`;
  } else if (nextStep) {
    nextAction = `Complete "${formatStageName(currentStage)}" and hand over to "${nextStep.name}".`;
  } else {
    nextAction = `Close out "${formatStageName(currentStage)}" to finish the journey.`;
  }

  return {
    workflowId: workflow.id,
    title: workflow.title ?? formatStageName(type),
    type,
    status: String(workflow.status ?? "active"),
    currentStage,
    currentStageName: stages[currentIndex]?.name ?? formatStageName(currentStage),
    progress,
    steps,
    daysInJourney,
    daysInCurrentStage,
    expectedTotalDays,
    stalled,
    nextStep,
    nextAction,
    targetUserId: workflow.target_user_id ?? null,
  };
}

export function summarizeJourneys(timelines: JourneyTimeline[]) {
  const active = timelines.filter((t) => !["completed", "cancelled"].includes(t.status));
  return {
    total: timelines.length,
    active: active.length,
    stalled: active.filter((t) => t.stalled).length,
    completed: timelines.filter((t) => t.status === "completed").length,
    avgProgress: active.length
      ? Math.round(active.reduce((s, t) => s + t.progress, 0) / active.length)
      : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Leave & travel                                                      */
/* ------------------------------------------------------------------ */

export interface LeaveTravelItem {
  id: string;
  kind: "leave" | "travel" | "wfh" | "other";
  reference: string | null;
  title: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  days: number | null;
  waitingDays: number;
  slaDeadline: Date | null;
  overdue: boolean;
  nextAction: string;
}

const PENDING_STATES = ["pending", "under_review", "submitted"];

export function mapLeaveRequest(row: any, now: Date = new Date()): LeaveTravelItem {
  const created = toDate(row.created_at);
  const status = String(row.status ?? "pending");
  const pending = PENDING_STATES.includes(status);
  const waitingDays = pending ? daysSince(created, now) : 0;
  return {
    id: row.id,
    kind: "leave",
    reference: row.request_number ?? null,
    title: row.reason ? `Leave — ${row.reason}` : "Leave request",
    status,
    startDate: toDate(row.start_date),
    endDate: toDate(row.end_date),
    days: row.days_requested !== null && row.days_requested !== undefined ? Number(row.days_requested) : null,
    waitingDays,
    slaDeadline: null,
    overdue: pending && waitingDays > 2,
    nextAction: pending
      ? waitingDays > 2
        ? `Approve or decline — pending ${waitingDays} days.`
        : "Awaiting approver review."
      : status === "approved"
        ? "Approved — plan cover for the absence."
        : "No action required.",
  };
}

export function mapEmployeeRequest(row: any, now: Date = new Date()): LeaveTravelItem {
  const type = String(row.type ?? "other");
  const kind: LeaveTravelItem["kind"] =
    type === "leave" ? "leave" : type === "work_from_home" ? "wfh" : "other";
  const status = String(row.status ?? "pending");
  const pending = PENDING_STATES.includes(status);
  const created = toDate(row.submitted_at) ?? toDate(row.created_at);
  const waitingDays = pending ? daysSince(created, now) : 0;
  const slaDeadline = toDate(row.sla_deadline);
  const overdue = pending && !!slaDeadline && slaDeadline < now;
  return {
    id: row.id,
    kind: kind === "other" && /travel/i.test(String(row.title ?? "")) ? "travel" : kind,
    reference: row.request_number ?? null,
    title: row.title || formatStageName(type),
    status,
    startDate: toDate(row.leave_start_date) ?? toDate(row.wfh_date),
    endDate: toDate(row.leave_end_date) ?? toDate(row.wfh_date),
    days: null,
    waitingDays,
    slaDeadline,
    overdue,
    nextAction: overdue
      ? "SLA breached — action this request now."
      : pending
        ? row.escalated
          ? "Escalated — needs a decision from the next approver."
          : "Awaiting approver review."
        : "No action required.",
  };
}

export function summarizeLeaveTravel(items: LeaveTravelItem[], now: Date = new Date()) {
  const pending = items.filter((i) => PENDING_STATES.includes(i.status));
  const upcoming = items.filter(
    (i) => i.status === "approved" && i.startDate && i.startDate >= now && i.startDate <= addDays(now, 30),
  );
  return {
    total: items.length,
    pending: pending.length,
    overdue: items.filter((i) => i.overdue).length,
    upcoming: upcoming.length,
    daysOut: items
      .filter((i) => i.status === "approved")
      .reduce((s, i) => s + (i.days ?? 0), 0),
  };
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

export interface TrainingRow {
  id: string;
  courseTitle: string;
  category: string | null;
  level: string | null;
  progress: number;
  completed: boolean;
  lastAccessed: Date | null;
  staleDays: number;
  nextAction: string;
}

export function mapTraining(progressRow: any, course: any, now: Date = new Date()): TrainingRow {
  const progress = Number(progressRow?.progress_percent ?? 0);
  const completed = !!progressRow?.completed_at || progress >= 100;
  const lastAccessed = toDate(progressRow?.last_accessed_at) ?? toDate(progressRow?.started_at);
  const staleDays = completed ? 0 : daysSince(lastAccessed, now);
  return {
    id: progressRow?.id ?? course?.id,
    courseTitle: course?.title ?? "Course",
    category: course?.category ?? null,
    level: course?.level ?? null,
    progress: completed ? 100 : progress,
    completed,
    lastAccessed,
    staleDays,
    nextAction: completed
      ? "Completed — log the skill in your matrix."
      : staleDays > 21
        ? `Restart — no activity for ${staleDays} days.`
        : progress === 0
          ? "Not started — block 30 minutes this week."
          : "Continue where you left off.",
  };
}

export interface CertificationAlert {
  id: string;
  name: string;
  issuer: string | null;
  expiryDate: Date | null;
  daysToExpiry: number | null;
  state: "expired" | "expiring" | "valid" | "no_expiry";
}

export function mapCertification(row: any, now: Date = new Date()): CertificationAlert {
  const expiry = toDate(row.expiry_date);
  const daysToExpiry = expiry ? Math.round((expiry.getTime() - now.getTime()) / MS_DAY) : null;
  const state: CertificationAlert["state"] =
    daysToExpiry === null ? "no_expiry" : daysToExpiry < 0 ? "expired" : daysToExpiry <= 60 ? "expiring" : "valid";
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuing_organization ?? null,
    expiryDate: expiry,
    daysToExpiry,
    state,
  };
}

export function summarizeTraining(rows: TrainingRow[], certs: CertificationAlert[]) {
  const completed = rows.filter((r) => r.completed).length;
  return {
    enrolled: rows.length,
    completed,
    inProgress: rows.filter((r) => !r.completed && r.progress > 0).length,
    stalled: rows.filter((r) => !r.completed && r.staleDays > 21).length,
    completionRate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
    certsExpiring: certs.filter((c) => c.state === "expiring").length,
    certsExpired: certs.filter((c) => c.state === "expired").length,
  };
}
