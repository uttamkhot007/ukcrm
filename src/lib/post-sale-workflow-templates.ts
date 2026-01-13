// Post-Sale Workflow Templates - From Closed Won to Technical/Renewals/Managed Services

export interface PostSaleWorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration?: string;
  requiredApprovers?: string[];
  canSkip?: boolean;
  skipCondition?: string;
}

export interface PostSaleWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: 'odf_approval' | 'order_processing' | 'invoicing' | 'payment_collection' | 'support_onboarding' | 'managed_service_onboarding' | 'renewal_setup';
  stages: PostSaleWorkflowStage[];
  triggeredBy?: string;
  nextWorkflow?: string;
  appliesTo?: ('product' | 'service' | 'product_with_service')[];
}

// ODF (Order Document Form) Approval Stages
export const ODF_APPROVAL_STAGES: PostSaleWorkflowStage[] = [
  {
    id: 'odf_creation',
    name: 'ODF Creation',
    description: 'Create Order Document Form with all deal details',
    order: 1,
    estimatedDuration: '1 day',
  },
  {
    id: 'document_verification',
    name: 'Document Verification',
    description: 'Verify all customer documents (PO, MSA, NDA, SOW)',
    order: 2,
    estimatedDuration: '1-2 days',
  },
  {
    id: 'financial_review',
    name: 'Financial Review',
    description: 'Review pricing, margins, and payment terms',
    order: 3,
    estimatedDuration: '1 day',
  },
  {
    id: 'manager_approval',
    name: 'Manager Approval',
    description: 'Get approval from sales/accounts manager',
    order: 4,
    estimatedDuration: '1-2 days',
    requiredApprovers: ['manager'],
  },
  {
    id: 'order_committee_approval',
    name: 'Order Committee Approval',
    description: 'Final approval from order committee',
    order: 5,
    estimatedDuration: '1-2 days',
    requiredApprovers: ['admin', 'manager'],
  },
];

// Order Processing Stages (For Products Only)
export const ORDER_PROCESSING_STAGES: PostSaleWorkflowStage[] = [
  {
    id: 'vendor_quote_request',
    name: 'Vendor Quote Request',
    description: 'Request quote from vendor/distributor/OEM',
    order: 1,
    estimatedDuration: '1-2 days',
  },
  {
    id: 'po_creation',
    name: 'PO Creation',
    description: 'Create Purchase Order for vendor',
    order: 2,
    estimatedDuration: '1 day',
  },
  {
    id: 'po_dispatch',
    name: 'PO Dispatch',
    description: 'Send PO to vendor and track acknowledgment',
    order: 3,
    estimatedDuration: '1 day',
  },
  {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    description: 'Receive order confirmation from vendor',
    order: 4,
    estimatedDuration: '2-3 days',
  },
  {
    id: 'delivery_tracking',
    name: 'Delivery Tracking',
    description: 'Track license/product delivery from vendor',
    order: 5,
    estimatedDuration: 'Variable',
  },
  {
    id: 'license_received',
    name: 'License/Product Received',
    description: 'Confirm receipt of license keys or products',
    order: 6,
    estimatedDuration: '1 day',
  },
  {
    id: 'customer_delivery',
    name: 'Customer Delivery',
    description: 'Deliver license/product to customer',
    order: 7,
    estimatedDuration: '1-2 days',
  },
  {
    id: 'delivery_acknowledgment',
    name: 'Delivery Acknowledgment',
    description: 'Get delivery acknowledgment from customer',
    order: 8,
    estimatedDuration: '1-3 days',
  },
];

// Invoicing Stages
export const INVOICING_STAGES: PostSaleWorkflowStage[] = [
  {
    id: 'invoice_preparation',
    name: 'Invoice Preparation',
    description: 'Prepare invoice with correct details and taxes',
    order: 1,
    estimatedDuration: '1 day',
  },
  {
    id: 'invoice_approval',
    name: 'Invoice Approval',
    description: 'Internal approval for invoice',
    order: 2,
    estimatedDuration: '1 day',
    requiredApprovers: ['manager'],
  },
  {
    id: 'invoice_dispatch',
    name: 'Invoice Dispatch',
    description: 'Send invoice to customer',
    order: 3,
    estimatedDuration: '1 day',
  },
  {
    id: 'invoice_acknowledgment',
    name: 'Invoice Acknowledgment',
    description: 'Confirm customer received the invoice',
    order: 4,
    estimatedDuration: '1-2 days',
  },
];

// Payment Collection Stages
export const PAYMENT_COLLECTION_STAGES: PostSaleWorkflowStage[] = [
  {
    id: 'payment_pending',
    name: 'Payment Pending',
    description: 'Awaiting payment from customer',
    order: 1,
    estimatedDuration: 'Per payment terms',
  },
  {
    id: 'followup_week1',
    name: 'Follow-up Week 1',
    description: 'First payment reminder',
    order: 2,
    estimatedDuration: '7 days',
  },
  {
    id: 'followup_week2',
    name: 'Follow-up Week 2',
    description: 'Second payment reminder',
    order: 3,
    estimatedDuration: '7 days',
  },
  {
    id: 'partial_payment',
    name: 'Partial Payment Received',
    description: 'Partial payment received, track balance',
    order: 4,
    canSkip: true,
    skipCondition: 'Full payment received directly',
  },
  {
    id: 'escalation',
    name: 'Payment Escalation',
    description: 'Escalate to management for delayed payment',
    order: 5,
    requiredApprovers: ['manager'],
    canSkip: true,
  },
  {
    id: 'full_payment',
    name: 'Full Payment Received',
    description: 'Complete payment received',
    order: 6,
    estimatedDuration: 'Variable',
  },
  {
    id: 'receipt_generation',
    name: 'Receipt Generation',
    description: 'Generate and send payment receipt',
    order: 7,
    estimatedDuration: '1 day',
  },
];

// Support Onboarding Stages
export const SUPPORT_ONBOARDING_STAGES: PostSaleWorkflowStage[] = [
  {
    id: 'contract_activation',
    name: 'Contract Activation',
    description: 'Activate support contract in system',
    order: 1,
    estimatedDuration: '1 day',
  },
  {
    id: 'portal_access_creation',
    name: 'Portal Access Creation',
    description: 'Create customer portal access credentials',
    order: 2,
    estimatedDuration: '1 day',
  },
  {
    id: 'welcome_communication',
    name: 'Welcome Communication',
    description: 'Send welcome email with access details and SLA info',
    order: 3,
    estimatedDuration: '1 day',
  },
  {
    id: 'onboarding_call',
    name: 'Onboarding Call',
    description: 'Schedule and conduct onboarding call with customer',
    order: 4,
    estimatedDuration: '3-5 days',
  },
  {
    id: 'documentation_handover',
    name: 'Documentation Handover',
    description: 'Share support documentation and escalation matrix',
    order: 5,
    estimatedDuration: '1-2 days',
  },
];

// Managed Service Onboarding Stages
export const MANAGED_SERVICE_ONBOARDING_STAGES: PostSaleWorkflowStage[] = [
  {
    id: 'environment_assessment',
    name: 'Environment Assessment',
    description: 'Assess customer environment and requirements',
    order: 1,
    estimatedDuration: '3-5 days',
  },
  {
    id: 'access_setup',
    name: 'Access Setup',
    description: 'Set up required access to customer systems',
    order: 2,
    estimatedDuration: '2-3 days',
  },
  {
    id: 'monitoring_configuration',
    name: 'Monitoring Configuration',
    description: 'Configure monitoring and alerting',
    order: 3,
    estimatedDuration: '3-5 days',
  },
  {
    id: 'runbook_creation',
    name: 'Runbook Creation',
    description: 'Create operational runbooks',
    order: 4,
    estimatedDuration: '5-7 days',
  },
  {
    id: 'handover_to_ops',
    name: 'Handover to Operations',
    description: 'Hand over to managed services operations team',
    order: 5,
    estimatedDuration: '2-3 days',
  },
];

// Renewal Setup Stages
export const RENEWAL_SETUP_STAGES: PostSaleWorkflowStage[] = [
  {
    id: 'renewal_entry',
    name: 'Renewal Entry',
    description: 'Create renewal tracking entry',
    order: 1,
    estimatedDuration: '1 day',
  },
  {
    id: 'reminder_setup',
    name: 'Reminder Setup',
    description: 'Set up renewal reminders (4/3/2/1 weeks before)',
    order: 2,
    estimatedDuration: '1 day',
  },
  {
    id: 'owner_assignment',
    name: 'Owner Assignment',
    description: 'Assign renewal owner for follow-up',
    order: 3,
    estimatedDuration: '1 day',
  },
];

// All Templates
export const POST_SALE_WORKFLOW_TEMPLATES: PostSaleWorkflowTemplate[] = [
  {
    id: 'odf_approval',
    name: 'ODF Approval',
    description: 'Order Document Form creation and approval workflow',
    type: 'odf_approval',
    stages: ODF_APPROVAL_STAGES,
    triggeredBy: 'Deal moves to Closed Won',
    nextWorkflow: 'order_processing (for products) or invoicing (for services)',
    appliesTo: ['product', 'service', 'product_with_service'],
  },
  {
    id: 'order_processing',
    name: 'Order Processing',
    description: 'Product order processing from vendor to customer delivery',
    type: 'order_processing',
    stages: ORDER_PROCESSING_STAGES,
    triggeredBy: 'ODF Approval completed',
    nextWorkflow: 'invoicing',
    appliesTo: ['product', 'product_with_service'],
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    description: 'Invoice creation and dispatch to customer',
    type: 'invoicing',
    stages: INVOICING_STAGES,
    triggeredBy: 'Order Processing completed (products) or ODF Approval completed (services)',
    nextWorkflow: 'payment_collection',
    appliesTo: ['product', 'service', 'product_with_service'],
  },
  {
    id: 'payment_collection',
    name: 'Payment Collection',
    description: 'Track and collect payment from customer',
    type: 'payment_collection',
    stages: PAYMENT_COLLECTION_STAGES,
    triggeredBy: 'Invoicing completed',
    nextWorkflow: 'support_onboarding / managed_service_onboarding / renewal_setup',
    appliesTo: ['product', 'service', 'product_with_service'],
  },
  {
    id: 'support_onboarding',
    name: 'Support Onboarding',
    description: 'Onboard customer to support portal and services',
    type: 'support_onboarding',
    stages: SUPPORT_ONBOARDING_STAGES,
    triggeredBy: 'Full payment received + Support included',
    appliesTo: ['product', 'service', 'product_with_service'],
  },
  {
    id: 'managed_service_onboarding',
    name: 'Managed Service Onboarding',
    description: 'Onboard customer to managed services',
    type: 'managed_service_onboarding',
    stages: MANAGED_SERVICE_ONBOARDING_STAGES,
    triggeredBy: 'Full payment received + Managed Service included',
    appliesTo: ['service', 'product_with_service'],
  },
  {
    id: 'renewal_setup',
    name: 'Renewal Setup',
    description: 'Set up renewal tracking and reminders',
    type: 'renewal_setup',
    stages: RENEWAL_SETUP_STAGES,
    triggeredBy: 'Full payment received + Renewal applicable',
    appliesTo: ['product', 'service', 'product_with_service'],
  },
];

// Helper functions
export function getPostSaleStagesForType(type: PostSaleWorkflowTemplate['type']): PostSaleWorkflowStage[] {
  const template = POST_SALE_WORKFLOW_TEMPLATES.find(t => t.type === type);
  return template?.stages || [];
}

export function getPostSaleStageProgress(currentStage: string, type: PostSaleWorkflowTemplate['type']): number {
  const stages = getPostSaleStagesForType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / stages.length) * 100);
}

export function getNextPostSaleStage(currentStage: string, type: PostSaleWorkflowTemplate['type']): PostSaleWorkflowStage | null {
  const stages = getPostSaleStagesForType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) return null;
  return stages[currentIndex + 1];
}

export function shouldSkipOrderProcessing(orderType: string): boolean {
  return orderType === 'service';
}

export function getApplicableWorkflows(orderType: string, includesSupport: boolean, includesManagedService: boolean, includesRenewal: boolean): PostSaleWorkflowTemplate['type'][] {
  const workflows: PostSaleWorkflowTemplate['type'][] = ['odf_approval'];
  
  if (orderType !== 'service') {
    workflows.push('order_processing');
  }
  
  workflows.push('invoicing', 'payment_collection');
  
  if (includesSupport) {
    workflows.push('support_onboarding');
  }
  
  if (includesManagedService) {
    workflows.push('managed_service_onboarding');
  }
  
  if (includesRenewal) {
    workflows.push('renewal_setup');
  }
  
  return workflows;
}

export function getWorkflowDisplayInfo(type: PostSaleWorkflowTemplate['type']): { label: string; color: string; icon: string } {
  const info: Record<string, { label: string; color: string; icon: string }> = {
    odf_approval: { label: 'ODF Approval', color: 'bg-blue-500', icon: 'FileCheck' },
    order_processing: { label: 'Order Processing', color: 'bg-purple-500', icon: 'Package' },
    invoicing: { label: 'Invoicing', color: 'bg-orange-500', icon: 'FileText' },
    payment_collection: { label: 'Payment Collection', color: 'bg-green-500', icon: 'DollarSign' },
    support_onboarding: { label: 'Support Onboarding', color: 'bg-cyan-500', icon: 'Headphones' },
    managed_service_onboarding: { label: 'Managed Service', color: 'bg-indigo-500', icon: 'Settings' },
    renewal_setup: { label: 'Renewal Setup', color: 'bg-amber-500', icon: 'RefreshCw' },
  };
  return info[type] || { label: type, color: 'bg-gray-500', icon: 'Circle' };
}
