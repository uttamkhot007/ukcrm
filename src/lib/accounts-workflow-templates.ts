// Accounts Workflow Templates - Order Processing & Payment Collection

export interface AccountsWorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration?: string;
  requiredApprovers?: string[];
  isAutoTrigger?: boolean; // For auto-created workflows like payment collection
}

export interface AccountsWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: "order_processing" | "payment_collection";
  stages: AccountsWorkflowStage[];
  requiredFields?: string[];
  estimatedDuration: string;
  canManuallyCreate: boolean; // Payment collection cannot be manually created
  triggeredBy?: string; // What triggers this workflow
}

// Order Processing Stages
export const ORDER_PROCESSING_STAGES: AccountsWorkflowStage[] = [
  {
    id: "document_review",
    name: "Document Review",
    description: "Review all submitted documents for completeness",
    order: 1,
    estimatedDuration: "1-2 days",
  },
  {
    id: "order_committee_approval",
    name: "Order Committee Approval",
    description: "Get approval from order committee for order processing",
    order: 2,
    estimatedDuration: "2-3 days",
    requiredApprovers: ["manager", "admin"],
  },
  {
    id: "po_preparation",
    name: "PO Preparation",
    description: "Accounts team prepares the Purchase Order",
    order: 3,
    estimatedDuration: "1-2 days",
  },
  {
    id: "po_dispatch",
    name: "PO Dispatch to Distributor",
    description: "Send PO to distributor/OEM and update order status",
    order: 4,
    estimatedDuration: "1 day",
  },
  {
    id: "order_confirmation",
    name: "Order Confirmation",
    description: "Confirm order receipt and expected delivery",
    order: 5,
    estimatedDuration: "1-2 days",
  },
];

// Payment Collection Stages (auto-triggered after order processing completes)
export const PAYMENT_COLLECTION_STAGES: AccountsWorkflowStage[] = [
  {
    id: "license_receival",
    name: "License Receival",
    description: "Track and confirm license delivery from vendor",
    order: 1,
    estimatedDuration: "Variable",
    isAutoTrigger: true,
  },
  {
    id: "license_delivery",
    name: "License Delivery to Customer",
    description: "Deliver license keys/access to customer",
    order: 2,
    estimatedDuration: "1-2 days",
  },
  {
    id: "delivery_confirmation",
    name: "Delivery Confirmation",
    description: "Get confirmation from customer on delivery",
    order: 3,
    estimatedDuration: "1-3 days",
  },
  {
    id: "invoicing",
    name: "Invoicing",
    description: "Generate and send invoice to customer",
    order: 4,
    estimatedDuration: "1 day",
  },
  {
    id: "payment_followup_1",
    name: "Payment Follow-up (Week 1)",
    description: "First payment reminder if not received",
    order: 5,
    estimatedDuration: "7 days",
  },
  {
    id: "payment_followup_2",
    name: "Payment Follow-up (Week 2)",
    description: "Second payment reminder",
    order: 6,
    estimatedDuration: "7 days",
  },
  {
    id: "payment_escalation",
    name: "Payment Escalation",
    description: "Escalate to management for delayed payment",
    order: 7,
    estimatedDuration: "3-5 days",
    requiredApprovers: ["manager"],
  },
  {
    id: "payment_collection",
    name: "Payment Collection",
    description: "Payment received and recorded",
    order: 8,
    estimatedDuration: "Variable",
  },
  {
    id: "receipt_generation",
    name: "Receipt Generation",
    description: "Generate and send payment receipt",
    order: 9,
    estimatedDuration: "1 day",
  },
];

export const ACCOUNTS_WORKFLOW_TEMPLATES: AccountsWorkflowTemplate[] = [
  {
    id: "order_processing_standard",
    name: "Order Processing (ODF)",
    description: "Standard order processing workflow - Document review, approvals, and PO generation",
    type: "order_processing",
    stages: ORDER_PROCESSING_STAGES,
    requiredFields: [
      "customer_po_number",
      "customer_po_url",
      "customer_payment_terms",
      "distri_oem_quote_url",
      "buying_cost",
      "selling_cost",
    ],
    estimatedDuration: "5-10 days",
    canManuallyCreate: true,
    triggeredBy: "Sales team receives PO & deal is Closed Won",
  },
  {
    id: "payment_collection_auto",
    name: "Payment Collection",
    description: "End-to-end payment collection - Auto-triggered after order processing completes",
    type: "payment_collection",
    stages: PAYMENT_COLLECTION_STAGES,
    estimatedDuration: "15-45 days",
    canManuallyCreate: false,
    triggeredBy: "Order Processing workflow completion",
  },
];

// Helper functions
export function getAccountsStagesForType(type: "order_processing" | "payment_collection"): AccountsWorkflowStage[] {
  return type === "order_processing" ? ORDER_PROCESSING_STAGES : PAYMENT_COLLECTION_STAGES;
}

export function getAccountsStageProgress(currentStage: string, type: "order_processing" | "payment_collection"): number {
  const stages = getAccountsStagesForType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / stages.length) * 100);
}

export function getNextAccountsStage(currentStage: string, type: "order_processing" | "payment_collection"): AccountsWorkflowStage | null {
  const stages = getAccountsStagesForType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) return null;
  return stages[currentIndex + 1];
}

export function getPreviousAccountsStage(currentStage: string, type: "order_processing" | "payment_collection"): AccountsWorkflowStage | null {
  const stages = getAccountsStagesForType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex <= 0) return null;
  return stages[currentIndex - 1];
}

export function formatAccountsStageName(stageId: string): string {
  return stageId
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isStageCompleted(stageOrder: number, currentStageOrder: number): boolean {
  return stageOrder < currentStageOrder;
}

export function isStageAccessible(stageOrder: number, currentStageOrder: number): boolean {
  return stageOrder <= currentStageOrder;
}
