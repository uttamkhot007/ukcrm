// Predefined HR Workflow Templates

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDays?: number;
  requiredApprovers?: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: "onboarding" | "offboarding" | "retention";
  stages: WorkflowStage[];
  requiredFields: string[];
  estimatedDuration: string;
}

export const ONBOARDING_STAGES: WorkflowStage[] = [
  { id: "requirement_submitted", name: "Requirement Submitted", description: "Manager submits new hire request", order: 1, estimatedDays: 1 },
  { id: "hr_review", name: "HR Review", description: "HR reviews and validates the requirement", order: 2, estimatedDays: 2, requiredApprovers: ["hr"] },
  { id: "budget_approval", name: "Budget Approval", description: "Finance approves the budget allocation", order: 3, estimatedDays: 3, requiredApprovers: ["finance", "management"] },
  { id: "hr_sourcing", name: "HR Sourcing", description: "HR sources candidates from various channels", order: 4, estimatedDays: 14 },
  { id: "profile_review", name: "Profile Review", description: "Manager reviews candidate profiles", order: 5, estimatedDays: 3 },
  { id: "manager_interview", name: "Manager Interview", description: "First round interview with hiring manager", order: 6, estimatedDays: 5 },
  { id: "senior_interview", name: "Senior Interview", description: "Technical/Senior team member interview", order: 7, estimatedDays: 3 },
  { id: "ceo_interview", name: "CEO Interview", description: "Final interview with CEO (for senior roles)", order: 8, estimatedDays: 3 },
  { id: "management_interview", name: "Management Interview", description: "Management panel interview", order: 9, estimatedDays: 3 },
  { id: "offer_preparation", name: "Offer Preparation", description: "HR prepares the offer letter", order: 10, estimatedDays: 2 },
  { id: "offer_sent", name: "Offer Sent", description: "Offer letter sent to candidate", order: 11, estimatedDays: 1 },
  { id: "offer_negotiation", name: "Offer Negotiation", description: "Candidate negotiation (if any)", order: 12, estimatedDays: 5 },
  { id: "offer_accepted", name: "Offer Accepted", description: "Candidate accepts the offer", order: 13, estimatedDays: 2 },
  { id: "document_collection", name: "Document Collection", description: "Collect joining documents", order: 14, estimatedDays: 7 },
  { id: "onboarding_prep", name: "Onboarding Preparation", description: "Prepare workstation, access, etc.", order: 15, estimatedDays: 3 },
  { id: "completed", name: "Completed", description: "Employee successfully onboarded", order: 16 },
];

export const OFFBOARDING_STAGES: WorkflowStage[] = [
  { id: "resignation_submitted", name: "Resignation Submitted", description: "Employee submits resignation", order: 1, estimatedDays: 1 },
  { id: "manager_review", name: "Manager Review", description: "Manager reviews and acknowledges", order: 2, estimatedDays: 2, requiredApprovers: ["manager"] },
  { id: "retention_review", name: "Retention Review", description: "HR evaluates retention possibility", order: 3, estimatedDays: 3, requiredApprovers: ["hr"] },
  { id: "exit_approved", name: "Exit Approved", description: "Resignation approved by management", order: 4, estimatedDays: 2, requiredApprovers: ["management"] },
  { id: "knowledge_transfer", name: "Knowledge Transfer", description: "Employee transfers knowledge to team", order: 5, estimatedDays: 14 },
  { id: "project_handover", name: "Project Handover", description: "Hand over ongoing projects", order: 6, estimatedDays: 7 },
  { id: "asset_return", name: "Asset Return", description: "Return company assets (laptop, ID, etc.)", order: 7, estimatedDays: 3 },
  { id: "exit_interview", name: "Exit Interview", description: "HR conducts exit interview", order: 8, estimatedDays: 1 },
  { id: "access_revocation", name: "Access Revocation", description: "IT revokes all system access", order: 9, estimatedDays: 1 },
  { id: "final_settlement", name: "Final Settlement", description: "Finance processes final settlement", order: 10, estimatedDays: 7 },
  { id: "completed", name: "Completed", description: "Offboarding completed", order: 11 },
];

export const RETENTION_STAGES: WorkflowStage[] = [
  { id: "retention_identified", name: "Retention Identified", description: "Employee identified for retention", order: 1, estimatedDays: 1 },
  { id: "hr_analysis", name: "HR Analysis", description: "HR analyzes retention risk factors", order: 2, estimatedDays: 3 },
  { id: "manager_discussion", name: "Manager Discussion", description: "Manager discusses with employee", order: 3, estimatedDays: 3 },
  { id: "retention_proposal", name: "Retention Proposal", description: "Prepare retention offer/proposal", order: 4, estimatedDays: 5 },
  { id: "management_approval", name: "Management Approval", description: "Management approves retention package", order: 5, estimatedDays: 3, requiredApprovers: ["management"] },
  { id: "employee_discussion", name: "Employee Discussion", description: "Present retention offer to employee", order: 6, estimatedDays: 3 },
  { id: "decision_pending", name: "Decision Pending", description: "Awaiting employee decision", order: 7, estimatedDays: 7 },
  { id: "retained", name: "Retained", description: "Employee decides to stay", order: 8 },
  { id: "not_retained", name: "Not Retained", description: "Employee decides to leave", order: 9 },
  { id: "completed", name: "Completed", description: "Retention workflow completed", order: 10 },
];

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "standard_onboarding",
    name: "Standard Onboarding",
    description: "Complete hiring workflow from requirement to employee joining",
    type: "onboarding",
    stages: ONBOARDING_STAGES,
    requiredFields: ["jobTitle", "department"],
    estimatedDuration: "45-60 days",
  },
  {
    id: "urgent_onboarding",
    name: "Urgent Hiring",
    description: "Fast-track hiring for critical positions",
    type: "onboarding",
    stages: ONBOARDING_STAGES.filter(s => 
      !["ceo_interview", "management_interview", "offer_negotiation"].includes(s.id)
    ),
    requiredFields: ["jobTitle", "department", "justification"],
    estimatedDuration: "21-30 days",
  },
  {
    id: "standard_offboarding",
    name: "Standard Offboarding",
    description: "Complete employee exit process with knowledge transfer",
    type: "offboarding",
    stages: OFFBOARDING_STAGES,
    requiredFields: ["employeeId", "lastWorkingDate"],
    estimatedDuration: "30-45 days",
  },
  {
    id: "immediate_offboarding",
    name: "Immediate Exit",
    description: "Expedited offboarding for immediate departures",
    type: "offboarding",
    stages: OFFBOARDING_STAGES.filter(s => 
      !["retention_review", "knowledge_transfer", "project_handover"].includes(s.id)
    ),
    requiredFields: ["employeeId"],
    estimatedDuration: "7-14 days",
  },
  {
    id: "standard_retention",
    name: "Standard Retention",
    description: "Proactive retention workflow for at-risk employees",
    type: "retention",
    stages: RETENTION_STAGES,
    requiredFields: ["employeeId", "reason"],
    estimatedDuration: "21-30 days",
  },
];

export const getStagesForWorkflowType = (type: "onboarding" | "offboarding" | "retention"): WorkflowStage[] => {
  switch (type) {
    case "onboarding":
      return ONBOARDING_STAGES;
    case "offboarding":
      return OFFBOARDING_STAGES;
    case "retention":
      return RETENTION_STAGES;
    default:
      return [];
  }
};

export const getStageProgress = (currentStage: string, type: "onboarding" | "offboarding" | "retention"): number => {
  const stages = getStagesForWorkflowType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / stages.length) * 100);
};

export const getNextStage = (currentStage: string, type: "onboarding" | "offboarding" | "retention"): WorkflowStage | null => {
  const stages = getStagesForWorkflowType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) return null;
  return stages[currentIndex + 1];
};

export const getPreviousStage = (currentStage: string, type: "onboarding" | "offboarding" | "retention"): WorkflowStage | null => {
  const stages = getStagesForWorkflowType(type);
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  if (currentIndex <= 0) return null;
  return stages[currentIndex - 1];
};

export const formatStageName = (stageId: string): string => {
  return stageId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};
