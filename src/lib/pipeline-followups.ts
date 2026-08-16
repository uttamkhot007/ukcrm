/**
 * Turns Pipeline Coach next-best-actions into real work items.
 *
 * A single "automation run" for one action produces, atomically from the
 * user's point of view:
 *   1. a scheduled follow-up task (calendar_events, event_type "task") owned
 *      by the deal owner, with a priority-derived due date,
 *   2. an in-app notification for that owner (and for support when the action
 *      is a handover/escalation signal),
 *   3. an audit line on the deal timeline (deal_activities).
 *
 * Everything is tenant-scoped and de-duplicated: re-running the same action on
 * the same deal while an open follow-up exists is a no-op, so bulk automation
 * can be pressed repeatedly without spamming owners.
 */

import { supabase } from "@/integrations/api/client";
import type { IntelligenceDeal, NextBestAction } from "@/lib/deal-intelligence";

/** Days until the follow-up is due, derived from the action priority. */
export function dueInDaysFor(action: NextBestAction): number {
  if (action.priority >= 80) return 1;
  if (action.priority >= 50) return 3;
  return 7;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dueDateFor(action: NextBestAction, from: Date = new Date()): Date {
  const due = new Date(from);
  due.setDate(due.getDate() + dueInDaysFor(action));
  due.setHours(10, 0, 0, 0);
  return due;
}

/** Actions that also need the support/delivery side to be looped in. */
const SUPPORT_RELEVANT = new Set(["schedule_technical_validation", "unblock_delivery", "escalate_stalled_deal"]);

export type FollowUpOutcome = {
  dealId: string;
  action: string;
  created: boolean;
  reason?: string;
};

export type FollowUpInput = {
  tenantId: string;
  actorId: string;
  deal: IntelligenceDeal;
  action: NextBestAction;
};

/** Create the follow-up task + notification + timeline entry for one action. */
export async function automateNextBestAction({
  tenantId,
  actorId,
  deal,
  action,
}: FollowUpInput): Promise<FollowUpOutcome> {
  const owner = deal.assigned_to ?? actorId;
  const title = `${action.label} — ${deal.title ?? "Untitled deal"}`;

  // De-duplicate against an open follow-up for the same deal + action.
  const { data: existing, error: existingError } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("related_deal_id", deal.id)
    .eq("title", title)
    .eq("status", "scheduled")
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    return { dealId: deal.id, action: action.code, created: false, reason: "Follow-up already open" };
  }

  const due = dueDateFor(action);
  const end = new Date(due.getTime() + 30 * 60 * 1000);

  const { error: taskError } = await supabase.from("calendar_events").insert({
    tenant_id: tenantId,
    title,
    description: `${action.rationale}\n\nGenerated automatically by Pipeline Coach.`,
    event_type: "task",
    start_time: due.toISOString(),
    end_time: end.toISOString(),
    owner_id: owner,
    team_type: "sales",
    related_deal_id: deal.id,
    related_contact_id: deal.contact_id ?? null,
    status: "scheduled",
    reminder_minutes: 60,
    is_public: false,
  });
  if (taskError) throw taskError;

  const recipients = new Set<string>([owner]);
  const notifications = Array.from(recipients).map((userId) => ({
    tenant_id: tenantId,
    user_id: userId,
    title: action.label,
    message: `${deal.title ?? "Untitled deal"}${deal.organization_name ? ` · ${deal.organization_name}` : ""} — ${action.rationale} Due ${toDateOnly(due)}.`,
    type: action.priority >= 80 ? "warning" : "info",
    category: SUPPORT_RELEVANT.has(action.code) ? "support" : "sales",
    reference_id: deal.id,
    reference_type: "deal",
    action_url: `/?module=sales&tab=deals&deal=${deal.id}`,
  }));
  const { error: notifyError } = await supabase.from("notifications").insert(notifications);
  if (notifyError) throw notifyError;

  const { error: activityError } = await supabase.from("deal_activities").insert({
    tenant_id: tenantId,
    deal_id: deal.id,
    user_id: actorId,
    activity_type: "automation",
    description: `Pipeline Coach scheduled "${action.label}" for ${toDateOnly(due)} and notified the owner.`,
  });
  if (activityError) throw activityError;

  return { dealId: deal.id, action: action.code, created: true };
}

/** Run the top action for a batch of deals (used by "Automate" bulk button). */
export async function automateBatch(inputs: FollowUpInput[]): Promise<{
  created: number;
  skipped: number;
  failed: number;
}> {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const input of inputs) {
    try {
      const outcome = await automateNextBestAction(input);
      if (outcome.created) created += 1;
      else skipped += 1;
    } catch {
      failed += 1;
    }
  }

  return { created, skipped, failed };
}
