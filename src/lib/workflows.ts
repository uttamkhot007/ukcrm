import { supabase } from "@/integrations/api/client";

interface WorkflowPayload {
  type: string;
  entity_type: string;
  entity_id: string;
  data?: Record<string, any>;
}

export async function triggerWorkflow(payload: WorkflowPayload) {
  try {
    const { data, error } = await supabase.functions.invoke("workflow-trigger", {
      body: payload,
    });
    
    if (error) {
      console.error("Workflow trigger error:", error);
      return { success: false, error };
    }
    
    console.log("Workflow triggered:", payload.type, data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to trigger workflow:", error);
    return { success: false, error };
  }
}

// Convenience functions for common workflows
export const workflows = {
  ticketCreated: (ticketId: string) =>
    triggerWorkflow({ type: "ticket_created", entity_type: "tickets", entity_id: ticketId }),
    
  ticketEscalate: (ticketId: string, reason?: string) =>
    triggerWorkflow({ type: "ticket_escalate", entity_type: "tickets", entity_id: ticketId, data: { reason } }),
    
  invoiceCreated: (invoiceId: string) =>
    triggerWorkflow({ type: "invoice_created", entity_type: "invoices", entity_id: invoiceId }),
    
  invoiceSent: (invoiceId: string) =>
    triggerWorkflow({ type: "invoice_created", entity_type: "invoices", entity_id: invoiceId }),
    
  dealStageChanged: (dealId: string, oldStage: string, newStage: string) =>
    triggerWorkflow({ type: "deal_stage_changed", entity_type: "deals", entity_id: dealId, data: { oldStage, newStage } }),
    
  requestSubmitted: (requestId: string) =>
    triggerWorkflow({ type: "request_submitted", entity_type: "employee_requests", entity_id: requestId }),
    
  requestApproved: (requestId: string) =>
    triggerWorkflow({ type: "request_approved", entity_type: "employee_requests", entity_id: requestId }),
    
  requestRejected: (requestId: string, reason?: string) =>
    triggerWorkflow({ type: "request_rejected", entity_type: "employee_requests", entity_id: requestId, data: { reason } }),
    
  requestEscalated: (requestId: string) =>
    triggerWorkflow({ type: "request_escalated", entity_type: "employee_requests", entity_id: requestId }),
    
  requestUnderReview: (requestId: string) =>
    triggerWorkflow({ type: "request_under_review", entity_type: "employee_requests", entity_id: requestId }),
};
