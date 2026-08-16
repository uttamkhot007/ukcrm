/**
 * Deterministic deal risk + next-best-action engine.
 *
 * This runs entirely client-side on data already fetched from the database, so
 * the pipeline coach renders instantly (no AI round-trip). The AI layer in
 * `DealInsights` stays for narrative analysis; this engine covers the
 * always-on, explainable signals every rep needs on every deal.
 */

export interface IntelligenceDeal {
  id: string;
  title: string | null;
  value: number | null;
  stage: string | null;
  probability: number | null;
  expected_close_date: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_stage_change_at?: string | null;
  next_steps?: string | null;
  meddic_score?: number | null;
  meddic_metrics?: string | null;
  meddic_economic_buyer?: string | null;
  meddic_decision_criteria?: string | null;
  meddic_decision_process?: string | null;
  meddic_identify_pain?: string | null;
  meddic_champion?: string | null;
  contact_id?: string | null;
  organization_name?: string | null;
  assigned_to?: string | null;
}

export type RiskLevel = "healthy" | "watch" | "at_risk" | "critical";

export interface RiskFactor {
  /** Stable id so the UI can group / filter factors. */
  code: string;
  label: string;
  /** Points added to the risk score (0-100 scale). */
  weight: number;
  detail: string;
}

export interface NextBestAction {
  code: string;
  label: string;
  /** Higher runs first in the action queue. */
  priority: number;
  rationale: string;
}

export interface DealIntelligence {
  dealId: string;
  riskScore: number;
  level: RiskLevel;
  factors: RiskFactor[];
  actions: NextBestAction[];
  daysSinceActivity: number;
  daysToClose: number | null;
  meddicGaps: string[];
  /** Value at risk = deal value weighted by the risk score. */
  valueAtRisk: number;
}

/** Maximum healthy days a deal may sit untouched, per stage. */
export const STAGE_IDLE_LIMIT: Record<string, number> = {
  pipeline: 14,
  qualified: 21,
  proposal: 21,
  negotiation: 14,
  upside: 21,
  strong_upside: 14,
  commit: 10,
};

const MEDDIC_FIELDS: Array<{ key: keyof IntelligenceDeal; label: string }> = [
  { key: "meddic_metrics", label: "Metrics" },
  { key: "meddic_economic_buyer", label: "Economic Buyer" },
  { key: "meddic_decision_criteria", label: "Decision Criteria" },
  { key: "meddic_decision_process", label: "Decision Process" },
  { key: "meddic_identify_pain", label: "Identified Pain" },
  { key: "meddic_champion", label: "Champion" },
];

/** A MEDDIC field only counts as filled with real substance (3+ chars). */
function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length >= 3;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 45) return "at_risk";
  if (score >= 22) return "watch";
  return "healthy";
}

export function analyzeDeal(deal: IntelligenceDeal, now: Date = new Date()): DealIntelligence {
  const factors: RiskFactor[] = [];
  const actions: NextBestAction[] = [];

  const lastTouch = deal.updated_at ? new Date(deal.updated_at) : deal.created_at ? new Date(deal.created_at) : now;
  const daysSinceActivity = Math.max(0, daysBetween(lastTouch, now));
  const idleLimit = STAGE_IDLE_LIMIT[deal.stage ?? ""] ?? 21;

  if (daysSinceActivity > idleLimit) {
    const over = daysSinceActivity - idleLimit;
    const weight = Math.min(30, 10 + over);
    factors.push({
      code: "stalled",
      label: "Stalled in stage",
      weight,
      detail: `${daysSinceActivity} days without an update (${idleLimit}-day norm for this stage).`,
    });
    actions.push({
      code: "re_engage",
      label: "Re-engage the buyer with a status call",
      priority: 90,
      rationale: `No activity for ${daysSinceActivity} days — the deal is going cold.`,
    });
  }

  // Close date hygiene
  let daysToClose: number | null = null;
  if (deal.expected_close_date) {
    daysToClose = daysBetween(now, new Date(deal.expected_close_date));
    if (daysToClose < 0) {
      factors.push({
        code: "close_date_past",
        label: "Close date slipped",
        weight: Math.min(25, 12 + Math.abs(daysToClose) / 3),
        detail: `Expected close was ${Math.abs(daysToClose)} days ago and the deal is still open.`,
      });
      actions.push({
        code: "reset_close_date",
        label: "Re-forecast the close date with the champion",
        priority: 95,
        rationale: "The committed close date has already passed.",
      });
    } else if (daysToClose <= 14) {
      actions.push({
        code: "closing_plan",
        label: "Run the mutual close plan",
        priority: 80,
        rationale: `Closing in ${daysToClose} days — confirm paperwork, PO and approvals.`,
      });
    }
  } else {
    factors.push({
      code: "no_close_date",
      label: "No expected close date",
      weight: 12,
      detail: "Forecasting is unreliable without a committed close date.",
    });
    actions.push({
      code: "set_close_date",
      label: "Set an expected close date",
      priority: 70,
      rationale: "Deal cannot be forecast without a close date.",
    });
  }

  // MEDDIC completeness
  const meddicGaps = MEDDIC_FIELDS.filter((f) => !isFilled(deal[f.key])).map((f) => f.label);
  if (meddicGaps.length > 0) {
    factors.push({
      code: "meddic_gaps",
      label: `${meddicGaps.length} MEDDIC gap${meddicGaps.length > 1 ? "s" : ""}`,
      weight: Math.min(28, meddicGaps.length * 5),
      detail: `Missing: ${meddicGaps.join(", ")}.`,
    });
  }
  if (meddicGaps.includes("Economic Buyer")) {
    actions.push({
      code: "find_eb",
      label: "Identify and meet the economic buyer",
      priority: 92,
      rationale: "No economic buyer captured — deals without budget authority rarely close.",
    });
  }
  if (meddicGaps.includes("Champion")) {
    actions.push({
      code: "build_champion",
      label: "Develop an internal champion",
      priority: 85,
      rationale: "No champion identified to drive the deal internally.",
    });
  }
  if (meddicGaps.includes("Decision Process")) {
    actions.push({
      code: "map_process",
      label: "Map the decision & procurement process",
      priority: 66,
      rationale: "Unknown approval path is the most common cause of slipped close dates.",
    });
  }

  // Late-stage deals with weak qualification are the most dangerous
  const lateStage = ["proposal", "negotiation", "commit", "strong_upside"].includes(deal.stage ?? "");
  if (lateStage && meddicGaps.length >= 3) {
    factors.push({
      code: "late_stage_unqualified",
      label: "Late stage, weak qualification",
      weight: 18,
      detail: "Deal advanced past proposal with more than half of MEDDIC unanswered.",
    });
  }

  // Probability vs. stage sanity
  if (lateStage && (deal.probability ?? 0) < 40) {
    factors.push({
      code: "low_confidence_late",
      label: "Low confidence at late stage",
      weight: 10,
      detail: `Probability is ${deal.probability ?? 0}% despite a late-stage position.`,
    });
  }

  if (!isFilled(deal.next_steps)) {
    factors.push({
      code: "no_next_step",
      label: "No agreed next step",
      weight: 10,
      detail: "No next step recorded on the deal.",
    });
    actions.push({
      code: "agree_next_step",
      label: "Agree a dated next step with the customer",
      priority: 75,
      rationale: "Deals without a scheduled next step stall within two weeks.",
    });
  }

  if (!deal.contact_id) {
    factors.push({
      code: "no_contact",
      label: "No linked contact",
      weight: 8,
      detail: "Deal is not linked to any contact record.",
    });
    actions.push({
      code: "link_contact",
      label: "Link the buying contact to this deal",
      priority: 60,
      rationale: "Outreach and sequences cannot run without a contact.",
    });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.weight, 0);
  // Large deals carry more downside — nudge them up the queue.
  const valueWeight = (deal.value ?? 0) >= 5_000_000 ? 6 : (deal.value ?? 0) >= 1_000_000 ? 3 : 0;
  const riskScore = Math.max(0, Math.min(100, Math.round(rawScore + valueWeight)));

  if (actions.length === 0) {
    actions.push({
      code: "advance",
      label: "Advance to the next stage",
      priority: 40,
      rationale: "Qualification is complete and the deal is moving — push for the next commitment.",
    });
  }

  return {
    dealId: deal.id,
    riskScore,
    level: levelFromScore(riskScore),
    factors: factors.sort((a, b) => b.weight - a.weight),
    actions: actions.sort((a, b) => b.priority - a.priority),
    daysSinceActivity,
    daysToClose,
    meddicGaps,
    valueAtRisk: Math.round(((deal.value ?? 0) * riskScore) / 100),
  };
}

export interface PipelineIntelligenceSummary {
  total: number;
  critical: number;
  atRisk: number;
  watch: number;
  healthy: number;
  valueAtRisk: number;
  totalValue: number;
  /** Most frequent action codes across the pipeline. */
  topActions: Array<{ code: string; label: string; count: number }>;
}

export function summarize(results: DealIntelligence[], deals: IntelligenceDeal[]): PipelineIntelligenceSummary {
  const byCode = new Map<string, { code: string; label: string; count: number }>();
  for (const r of results) {
    const top = r.actions[0];
    if (!top) continue;
    const existing = byCode.get(top.code);
    if (existing) existing.count += 1;
    else byCode.set(top.code, { code: top.code, label: top.label, count: 1 });
  }

  return {
    total: results.length,
    critical: results.filter((r) => r.level === "critical").length,
    atRisk: results.filter((r) => r.level === "at_risk").length,
    watch: results.filter((r) => r.level === "watch").length,
    healthy: results.filter((r) => r.level === "healthy").length,
    valueAtRisk: results.reduce((s, r) => s + r.valueAtRisk, 0),
    totalValue: deals.reduce((s, d) => s + (d.value ?? 0), 0),
    topActions: [...byCode.values()].sort((a, b) => b.count - a.count).slice(0, 4),
  };
}
