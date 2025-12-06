import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowRequest {
  type: string;
  entity_type: string;
  entity_id: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Dynamically import Resend
  let resend: any = null;
  if (resendApiKey) {
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    resend = new Resend(resendApiKey);
  }

  try {
    const { type, entity_type, entity_id, data }: WorkflowRequest = await req.json();
    console.log(`Processing workflow: ${type} for ${entity_type} ${entity_id}`);

    let result: any = { success: true };

    switch (type) {
      case "ticket_created":
        result = await handleTicketCreated(supabase, resend, entity_id, data);
        break;
      case "ticket_sla_warning":
        result = await handleTicketSlaWarning(supabase, resend, entity_id, data);
        break;
      case "ticket_escalate":
        result = await handleTicketEscalation(supabase, resend, entity_id, data);
        break;
      case "invoice_created":
        result = await handleInvoiceCreated(supabase, resend, entity_id, data);
        break;
      case "invoice_overdue":
        result = await handleInvoiceOverdue(supabase, resend, entity_id, data);
        break;
      case "deal_stage_changed":
        result = await handleDealStageChanged(supabase, resend, entity_id, data);
        break;
      case "compliance_due":
        result = await handleComplianceDue(supabase, resend, entity_id, data);
        break;
      case "renewal_reminder":
        result = await handleRenewalReminder(supabase, resend, entity_id, data);
        break;
      case "request_submitted":
        result = await handleRequestSubmitted(supabase, resend, entity_id, data);
        break;
      case "request_approved":
        result = await handleRequestApproved(supabase, resend, entity_id, data);
        break;
      case "request_rejected":
        result = await handleRequestRejected(supabase, resend, entity_id, data);
        break;
      case "request_escalated":
        result = await handleRequestEscalated(supabase, resend, entity_id, data);
        break;
      case "request_under_review":
        result = await handleRequestUnderReview(supabase, resend, entity_id, data);
        break;
      default:
        console.log(`Unknown workflow type: ${type}`);
    }

    // Log the workflow execution
    await supabase.from("workflow_logs").insert({
      workflow_type: type,
      entity_type,
      entity_id,
      action: type,
      details: { ...data, result },
      status: result.success ? "completed" : "failed",
      error_message: result.error || null,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Workflow error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper: Create in-app notification
async function createNotification(
  supabase: any,
  userId: string,
  title: string,
  message: string,
  type: string,
  category: string,
  referenceId?: string,
  referenceType?: string
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    category,
    reference_id: referenceId,
    reference_type: referenceType,
  });
  if (error) console.error("Failed to create notification:", error);
}

// Helper: Send email notification
async function sendEmail(
  resend: any,
  to: string,
  subject: string,
  html: string
) {
  if (!resend) {
    console.log("Resend not configured, skipping email");
    return;
  }
  try {
    await resend.emails.send({
      from: "NexusCRM <notifications@resend.dev>",
      to: [to],
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

// Helper: Get managers
async function getManagers(supabase: any) {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "manager"]);
  return data?.map((r: any) => r.user_id) || [];
}

// Ticket Workflows
async function handleTicketCreated(supabase: any, resend: any, ticketId: string, data: any) {
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, contact:contacts(name, email)")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "Ticket not found" };

  // Notify managers about critical/high priority tickets
  if (["critical", "high"].includes(ticket.priority)) {
    const managers = await getManagers(supabase);
    for (const managerId of managers) {
      await createNotification(
        supabase,
        managerId,
        `🔴 ${ticket.priority.toUpperCase()} Priority Ticket`,
        `New ticket: ${ticket.title} (${ticket.ticket_number})`,
        "warning",
        "ticket",
        ticketId,
        "tickets"
      );
    }
  }

  // Send email to contact
  if (ticket.contact?.email) {
    await sendEmail(
      resend,
      ticket.contact.email,
      `Ticket Created: ${ticket.ticket_number}`,
      `<h2>Your ticket has been created</h2>
       <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
       <p><strong>Title:</strong> ${ticket.title}</p>
       <p><strong>Priority:</strong> ${ticket.priority}</p>
       <p>Our team will respond within the SLA timeframe.</p>`
    );
  }

  return { success: true, message: "Ticket created workflow completed" };
}

async function handleTicketSlaWarning(supabase: any, resend: any, ticketId: string, data: any) {
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "Ticket not found" };

  // Notify assigned user and managers
  if (ticket.assigned_to) {
    await createNotification(
      supabase,
      ticket.assigned_to,
      "⚠️ SLA Warning",
      `Ticket ${ticket.ticket_number} is approaching SLA deadline`,
      "warning",
      "ticket",
      ticketId,
      "tickets"
    );
  }

  const managers = await getManagers(supabase);
  for (const managerId of managers) {
    await createNotification(
      supabase,
      managerId,
      "⚠️ SLA Warning",
      `Ticket ${ticket.ticket_number} needs attention - SLA deadline approaching`,
      "warning",
      "ticket",
      ticketId,
      "tickets"
    );
  }

  return { success: true, message: "SLA warning sent" };
}

async function handleTicketEscalation(supabase: any, resend: any, ticketId: string, data: any) {
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "Ticket not found" };

  // Update ticket status and escalation level
  const newLevel = (ticket.escalation_level || 0) + 1;
  await supabase
    .from("tickets")
    .update({ status: "escalated", escalation_level: newLevel })
    .eq("id", ticketId);

  // Notify all managers
  const managers = await getManagers(supabase);
  for (const managerId of managers) {
    await createNotification(
      supabase,
      managerId,
      "🚨 Ticket Escalated",
      `Ticket ${ticket.ticket_number} has been escalated to level ${newLevel}`,
      "error",
      "ticket",
      ticketId,
      "tickets"
    );
  }

  // Get manager emails and send notifications
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email")
    .in("user_id", managers);

  for (const profile of profiles || []) {
    if (profile.email) {
      await sendEmail(
        resend,
        profile.email,
        `🚨 ESCALATION: Ticket ${ticket.ticket_number}`,
        `<h2>Ticket Escalated</h2>
         <p><strong>Ticket:</strong> ${ticket.ticket_number}</p>
         <p><strong>Title:</strong> ${ticket.title}</p>
         <p><strong>Escalation Level:</strong> ${newLevel}</p>
         <p><strong>Priority:</strong> ${ticket.priority}</p>
         <p>This ticket requires immediate attention.</p>`
      );
    }
  }

  return { success: true, message: "Ticket escalated" };
}

// Invoice Workflows
async function handleInvoiceCreated(supabase: any, resend: any, invoiceId: string, data: any) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, contact:contacts(name, email)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { success: false, error: "Invoice not found" };

  // Send invoice email to contact
  if (invoice.contact?.email) {
    await sendEmail(
      resend,
      invoice.contact.email,
      `Invoice ${invoice.invoice_number} from NexusCRM`,
      `<h2>Invoice</h2>
       <p>Dear ${invoice.contact.name},</p>
       <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
       <p><strong>Amount:</strong> ₹${invoice.total.toLocaleString()}</p>
       <p><strong>Due Date:</strong> ${invoice.due_date}</p>
       <p>Please ensure timely payment.</p>`
    );
  }

  return { success: true, message: "Invoice notification sent" };
}

async function handleInvoiceOverdue(supabase: any, resend: any, invoiceId: string, data: any) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, contact:contacts(name, email)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { success: false, error: "Invoice not found" };

  // Update status to overdue
  await supabase.from("invoices").update({ status: "overdue" }).eq("id", invoiceId);

  // Notify finance team (managers)
  const managers = await getManagers(supabase);
  for (const managerId of managers) {
    await createNotification(
      supabase,
      managerId,
      "💰 Invoice Overdue",
      `Invoice ${invoice.invoice_number} for ₹${invoice.total.toLocaleString()} is overdue`,
      "error",
      "invoice",
      invoiceId,
      "invoices"
    );
  }

  // Send reminder to contact
  if (invoice.contact?.email) {
    await sendEmail(
      resend,
      invoice.contact.email,
      `Payment Reminder: Invoice ${invoice.invoice_number}`,
      `<h2>Payment Reminder</h2>
       <p>Dear ${invoice.contact.name},</p>
       <p>This is a reminder that payment for invoice ${invoice.invoice_number} is now overdue.</p>
       <p><strong>Amount Due:</strong> ₹${(invoice.total - (invoice.amount_paid || 0)).toLocaleString()}</p>
       <p>Please arrange for payment at the earliest.</p>`
    );
  }

  return { success: true, message: "Overdue notification sent" };
}

// Deal Workflows
async function handleDealStageChanged(supabase: any, resend: any, dealId: string, data: any) {
  const { data: deal } = await supabase
    .from("deals")
    .select("*, contact:contacts(name)")
    .eq("id", dealId)
    .single();

  if (!deal) return { success: false, error: "Deal not found" };

  // Notify deal owner
  await createNotification(
    supabase,
    deal.user_id,
    "📊 Deal Stage Updated",
    `Deal "${deal.title}" moved to ${deal.stage.replace("_", " ")}`,
    "info",
    "deal",
    dealId,
    "deals"
  );

  // If closed won, notify managers
  if (deal.stage === "closed_won") {
    const managers = await getManagers(supabase);
    for (const managerId of managers) {
      await createNotification(
        supabase,
        managerId,
        "🎉 Deal Won!",
        `Deal "${deal.title}" worth ₹${deal.value.toLocaleString()} has been won!`,
        "success",
        "deal",
        dealId,
        "deals"
      );
    }
  }

  return { success: true, message: "Deal stage notification sent" };
}

// Compliance Workflows
async function handleComplianceDue(supabase: any, resend: any, controlId: string, data: any) {
  const { data: control } = await supabase
    .from("compliance_controls")
    .select("*, framework:compliance_frameworks(name)")
    .eq("id", controlId)
    .single();

  if (!control) return { success: false, error: "Control not found" };

  // Notify assigned user
  if (control.assigned_to) {
    await createNotification(
      supabase,
      control.assigned_to,
      "📋 Compliance Review Due",
      `Control ${control.control_id} (${control.title}) needs review`,
      "warning",
      "compliance",
      controlId,
      "compliance_controls"
    );
  }

  // Notify managers
  const managers = await getManagers(supabase);
  for (const managerId of managers) {
    await createNotification(
      supabase,
      managerId,
      "📋 Compliance Review Due",
      `${control.framework?.name}: Control ${control.control_id} needs review`,
      "warning",
      "compliance",
      controlId,
      "compliance_controls"
    );
  }

  return { success: true, message: "Compliance due notification sent" };
}

// Renewal Workflows
async function handleRenewalReminder(supabase: any, resend: any, renewalId: string, data: any) {
  const { data: renewal } = await supabase
    .from("renewals")
    .select("*, contact:contacts(name, email)")
    .eq("id", renewalId)
    .single();

  if (!renewal) return { success: false, error: "Renewal not found" };

  const daysLeft = data?.daysLeft || 30;

  // Notify assigned user
  if (renewal.assigned_to) {
    await createNotification(
      supabase,
      renewal.assigned_to,
      `🔄 Renewal Due in ${daysLeft} days`,
      `${renewal.name} expires on ${renewal.expiry_date}`,
      daysLeft <= 7 ? "error" : "warning",
      "renewal",
      renewalId,
      "renewals"
    );
  }

  // Notify managers
  const managers = await getManagers(supabase);
  for (const managerId of managers) {
    await createNotification(
      supabase,
      managerId,
      `🔄 Renewal Expiring`,
      `${renewal.name} expires in ${daysLeft} days`,
      daysLeft <= 7 ? "error" : "warning",
      "renewal",
      renewalId,
      "renewals"
    );
  }

  return { success: true, message: "Renewal reminder sent" };
}

// Request Workflows
async function handleRequestSubmitted(supabase: any, resend: any, requestId: string, data: any) {
  const { data: request } = await supabase
    .from("employee_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { success: false, error: "Request not found" };

  // Notify managers based on assigned team
  const managers = await getManagers(supabase);
  for (const managerId of managers) {
    await createNotification(
      supabase,
      managerId,
      "📝 New Employee Request",
      `${request.request_number}: ${request.title}`,
      "info",
      "request",
      requestId,
      "employee_requests"
    );
  }

  return { success: true, message: "Request notification sent" };
}

async function handleRequestApproved(supabase: any, resend: any, requestId: string, data: any) {
  const { data: request } = await supabase
    .from("employee_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { success: false, error: "Request not found" };

  // Notify the requester
  await createNotification(
    supabase,
    request.user_id,
    "✅ Request Approved",
    `Your request ${request.request_number} has been approved`,
    "success",
    "request",
    requestId,
    "employee_requests"
  );

  // Get user email and send notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", request.user_id)
    .single();

  if (profile?.email) {
    await sendEmail(
      resend,
      profile.email,
      `Request Approved: ${request.request_number}`,
      `<h2>Request Approved</h2>
       <p>Dear ${profile.full_name},</p>
       <p>Your request <strong>${request.request_number}</strong> has been approved.</p>
       <p><strong>Title:</strong> ${request.title}</p>
       <p><strong>Type:</strong> ${request.type.replace("_", " ")}</p>`
    );
  }

  return { success: true, message: "Approval notification sent" };
}

async function handleRequestRejected(supabase: any, resend: any, requestId: string, data: any) {
  const { data: request } = await supabase
    .from("employee_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { success: false, error: "Request not found" };

  // Notify the requester
  await createNotification(
    supabase,
    request.user_id,
    "❌ Request Rejected",
    `Your request ${request.request_number} has been rejected${data?.reason ? `: ${data.reason}` : ""}`,
    "error",
    "request",
    requestId,
    "employee_requests"
  );

  // Get user email and send notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", request.user_id)
    .single();

  if (profile?.email) {
    await sendEmail(
      resend,
      profile.email,
      `Request Rejected: ${request.request_number}`,
      `<h2>Request Rejected</h2>
       <p>Dear ${profile.full_name},</p>
       <p>Your request <strong>${request.request_number}</strong> has been rejected.</p>
       <p><strong>Title:</strong> ${request.title}</p>
       <p><strong>Type:</strong> ${request.type.replace("_", " ")}</p>
       ${data?.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}`
    );
  }

  return { success: true, message: "Rejection notification sent" };
}

async function handleRequestEscalated(supabase: any, resend: any, requestId: string, data: any) {
  const { data: request } = await supabase
    .from("employee_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { success: false, error: "Request not found" };

  const newLevel = (request.escalation_level || 0) + 1;

  // Update escalation status
  await supabase
    .from("employee_requests")
    .update({ 
      escalated: true, 
      escalation_level: newLevel 
    })
    .eq("id", requestId);

  // Notify all managers
  const managers = await getManagers(supabase);
  for (const managerId of managers) {
    await createNotification(
      supabase,
      managerId,
      "🚨 Request Escalated",
      `Request ${request.request_number} has been escalated to level ${newLevel}`,
      "error",
      "request",
      requestId,
      "employee_requests"
    );
  }

  // Get manager emails and send notifications
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email")
    .in("user_id", managers);

  for (const profile of profiles || []) {
    if (profile.email) {
      await sendEmail(
        resend,
        profile.email,
        `🚨 ESCALATION: Request ${request.request_number}`,
        `<h2>Request Escalated</h2>
         <p><strong>Request:</strong> ${request.request_number}</p>
         <p><strong>Title:</strong> ${request.title}</p>
         <p><strong>Escalation Level:</strong> ${newLevel}</p>
         <p><strong>Priority:</strong> ${request.priority}</p>
         <p>This request requires immediate attention.</p>`
      );
    }
  }

  // Notify the requester
  await createNotification(
    supabase,
    request.user_id,
    "⚠️ Request Escalated",
    `Your request ${request.request_number} has been escalated for faster resolution`,
    "warning",
    "request",
    requestId,
    "employee_requests"
  );

  return { success: true, message: "Escalation notification sent" };
}

async function handleRequestUnderReview(supabase: any, resend: any, requestId: string, data: any) {
  const { data: request } = await supabase
    .from("employee_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { success: false, error: "Request not found" };

  // Notify the requester
  await createNotification(
    supabase,
    request.user_id,
    "👀 Request Under Review",
    `Your request ${request.request_number} is now being reviewed`,
    "info",
    "request",
    requestId,
    "employee_requests"
  );

  return { success: true, message: "Under review notification sent" };
}
