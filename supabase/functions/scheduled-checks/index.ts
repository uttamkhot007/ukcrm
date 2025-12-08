import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("Running scheduled workflow checks...");
  const results: any = { checks: [], timestamp: new Date().toISOString() };

  try {
    // 1. Check tickets approaching SLA
    const { data: slaTickets } = await supabase
      .from("tickets")
      .select("id, ticket_number, sla_deadline, status")
      .not("status", "in", '("resolved","closed")')
      .not("sla_deadline", "is", null);

    const now = new Date();
    for (const ticket of slaTickets || []) {
      const deadline = new Date(ticket.sla_deadline);
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      // SLA breach - escalate
      if (hoursLeft < 0 && ticket.status !== "escalated") {
        await triggerWorkflow(supabaseUrl, supabaseServiceKey, {
          type: "ticket_escalate",
          entity_type: "tickets",
          entity_id: ticket.id,
          data: { reason: "SLA breached" },
        });
        results.checks.push({ type: "ticket_escalate", ticket: ticket.ticket_number });
      }
      // SLA warning (< 1 hour left)
      else if (hoursLeft > 0 && hoursLeft < 1) {
        await triggerWorkflow(supabaseUrl, supabaseServiceKey, {
          type: "ticket_sla_warning",
          entity_type: "tickets",
          entity_id: ticket.id,
          data: { hoursLeft },
        });
        results.checks.push({ type: "ticket_sla_warning", ticket: ticket.ticket_number });
      }
    }

    // 2. Check overdue invoices
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, due_date, status")
      .lt("due_date", today)
      .not("status", "in", '("paid","cancelled","overdue")');

    for (const invoice of overdueInvoices || []) {
      await triggerWorkflow(supabaseUrl, supabaseServiceKey, {
        type: "invoice_overdue",
        entity_type: "invoices",
        entity_id: invoice.id,
        data: { dueDate: invoice.due_date },
      });
      results.checks.push({ type: "invoice_overdue", invoice: invoice.invoice_number });
    }

    // 3. Check renewals expiring soon
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 4 weeks reminder
    const { data: renewals4w } = await supabase
      .from("renewals")
      .select("id, name, expiry_date")
      .eq("notified_4_weeks", false)
      .lte("expiry_date", in30Days)
      .gt("expiry_date", in14Days)
      .not("status", "in", '("expired","renewed","cancelled")');

    for (const renewal of renewals4w || []) {
      await triggerWorkflow(supabaseUrl, supabaseServiceKey, {
        type: "renewal_reminder",
        entity_type: "renewals",
        entity_id: renewal.id,
        data: { daysLeft: 30 },
      });
      await supabase.from("renewals").update({ notified_4_weeks: true }).eq("id", renewal.id);
      results.checks.push({ type: "renewal_reminder_4w", renewal: renewal.name });
    }

    // 2 weeks reminder
    const { data: renewals2w } = await supabase
      .from("renewals")
      .select("id, name, expiry_date")
      .eq("notified_2_weeks", false)
      .lte("expiry_date", in14Days)
      .gt("expiry_date", in7Days)
      .not("status", "in", '("expired","renewed","cancelled")');

    for (const renewal of renewals2w || []) {
      await triggerWorkflow(supabaseUrl, supabaseServiceKey, {
        type: "renewal_reminder",
        entity_type: "renewals",
        entity_id: renewal.id,
        data: { daysLeft: 14 },
      });
      await supabase.from("renewals").update({ notified_2_weeks: true }).eq("id", renewal.id);
      results.checks.push({ type: "renewal_reminder_2w", renewal: renewal.name });
    }

    // 1 week reminder
    const { data: renewals1w } = await supabase
      .from("renewals")
      .select("id, name, expiry_date")
      .eq("notified_1_week", false)
      .lte("expiry_date", in7Days)
      .gte("expiry_date", today)
      .not("status", "in", '("expired","renewed","cancelled")');

    for (const renewal of renewals1w || []) {
      await triggerWorkflow(supabaseUrl, supabaseServiceKey, {
        type: "renewal_reminder",
        entity_type: "renewals",
        entity_id: renewal.id,
        data: { daysLeft: 7 },
      });
      await supabase.from("renewals").update({ notified_1_week: true }).eq("id", renewal.id);
      results.checks.push({ type: "renewal_reminder_1w", renewal: renewal.name });
    }

    // 4. Check compliance controls due for review (last assessed > 90 days ago)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: dueControls } = await supabase
      .from("compliance_controls")
      .select("id, control_id, title")
      .or(`last_assessed_at.is.null,last_assessed_at.lt.${ninetyDaysAgo}`)
      .eq("status", "compliant");

    for (const control of dueControls || []) {
      await triggerWorkflow(supabaseUrl, supabaseServiceKey, {
        type: "compliance_due",
        entity_type: "compliance_controls",
        entity_id: control.id,
        data: {},
      });
      results.checks.push({ type: "compliance_due", control: control.control_id });
    }

    // 5. Check SLA breached employee requests
    const { data: slaRequests } = await supabase
      .from("employee_requests")
      .select("id, request_number, sla_deadline, status, escalated")
      .in("status", ["pending", "under_review"])
      .eq("escalated", false)
      .not("sla_deadline", "is", null);

    for (const request of slaRequests || []) {
      const deadline = new Date(request.sla_deadline);
      if (deadline < now) {
        await supabase
          .from("employee_requests")
          .update({ escalated: true, escalation_level: 1 })
          .eq("id", request.id);
      results.checks.push({ type: "request_escalated", request: request.request_number });
      }
    }

    // 6. Weekly executive enrichment check (runs on Sundays or if forced)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) { // Sunday
      try {
        const enrichResponse = await fetch(`${supabaseUrl}/functions/v1/enrich-executives`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ refresh_all: true }),
        });
        
        if (enrichResponse.ok) {
          const enrichResult = await enrichResponse.json();
          results.checks.push({ 
            type: "executive_enrichment", 
            organizations_processed: enrichResult.organizations_processed 
          });
        }
      } catch (enrichError) {
        console.error("Executive enrichment failed:", enrichError);
      }
    }

    console.log(`Completed ${results.checks.length} workflow checks`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Scheduled check error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function triggerWorkflow(
  supabaseUrl: string,
  serviceKey: string,
  payload: any
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/workflow-trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to trigger workflow:", error);
  }
}
