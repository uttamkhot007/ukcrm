import { json, preflight } from "../_shared/ai.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Payload = {
  type: string;
  entity_type: string;
  entity_id: string;
  data?: Record<string, unknown>;
};

const TITLES: Record<string, string> = {
  ticket_created: "New support ticket",
  ticket_escalate: "Support ticket escalated",
  invoice_created: "Invoice created",
  deal_stage_changed: "Deal stage updated",
  request_submitted: "New request submitted",
  request_approved: "Request approved",
  request_rejected: "Request rejected",
  request_escalated: "Request escalated",
  request_under_review: "Request under review",
};

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const payload = (await req.json().catch(() => ({}))) as Payload;
    if (!payload?.type || !payload?.entity_type || !payload?.entity_id) {
      return json({ error: "type, entity_type and entity_id are required" }, 400);
    }
    if (!SERVICE_ROLE) return json({ error: "Server not configured" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { error: logError } = await admin.from("workflow_logs").insert({
      workflow_type: payload.type,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      action: "triggered",
      details: payload.data ?? {},
      status: "completed",
    });

    if (logError) {
      return json({ error: logError.message }, 400);
    }

    return json({
      success: true,
      workflow: payload.type,
      title: TITLES[payload.type] ?? payload.type,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
