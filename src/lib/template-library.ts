/**
 * Enterprise template library.
 *
 * A role-based catalog of ready-to-use document templates (Sales, Presales,
 * Technical, HR, Finance). Each entry is stored in `document_templates` when a
 * tenant installs it, with tenant branding merged in at install time so every
 * generated document carries the tenant's logo, colours and company details.
 */
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  ClipboardList,
  FileCheck,
  FileSignature,
  FileText,
  GraduationCap,
  HeartHandshake,
  LogOut,
  Receipt,
  Quote,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type TemplateRole = "sales" | "presales" | "technical" | "hr" | "finance";

export interface TemplateRoleInfo {
  value: TemplateRole;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface TemplateTypeInfo {
  value: string;
  label: string;
  role: TemplateRole;
  icon: LucideIcon;
  description: string;
}

export interface LibraryTemplate {
  key: string;
  name: string;
  description: string;
  template_type: string;
  role: TemplateRole;
  /** Solution family this template is tuned for (sales/presales/technical). */
  solution?: string;
  content: Record<string, unknown>;
  header_content: Record<string, unknown>;
  footer_content: Record<string, unknown>;
  branding: Record<string, unknown>;
}

export const TEMPLATE_ROLES: TemplateRoleInfo[] = [
  { value: "sales", label: "Sales", description: "Quotes and proposals per solution", icon: Quote },
  { value: "presales", label: "Presales", description: "POC plans and evaluation reports", icon: ClipboardList },
  { value: "technical", label: "Technical", description: "Implementation and handover packs", icon: Wrench },
  { value: "hr", label: "Human Resources", description: "Joining, exit, bonus and gratuity forms", icon: Users },
  { value: "finance", label: "Finance", description: "Invoices and billing documents", icon: Receipt },
];

export const TEMPLATE_TYPES: TemplateTypeInfo[] = [
  { value: "quote", label: "Quote / Quotation", role: "sales", icon: Quote, description: "Priced offers for customers" },
  { value: "proposal", label: "Proposal", role: "sales", icon: FileText, description: "Solution and business proposals" },
  { value: "rfp_response", label: "RFP / Tender Response", role: "sales", icon: FileSignature, description: "Structured bid responses" },
  { value: "poc_plan", label: "POC Plan", role: "presales", icon: ClipboardList, description: "Proof of concept planning" },
  { value: "poc_report", label: "POC Report", role: "presales", icon: BadgeCheck, description: "POC outcome and success criteria report" },
  { value: "solution_design", label: "Solution Design", role: "presales", icon: BookOpen, description: "Low/high level solution design" },
  { value: "implementation_plan", label: "Implementation Plan", role: "technical", icon: FileCheck, description: "Deployment and rollout planning" },
  { value: "runbook", label: "Runbook / SOP", role: "technical", icon: Wrench, description: "Operational runbooks and SOPs" },
  { value: "handover_document", label: "Handover Document", role: "technical", icon: ShieldCheck, description: "Project to support handover" },
  { value: "hr_onboarding", label: "New Joinee Form", role: "hr", icon: HeartHandshake, description: "Joining and onboarding paperwork" },
  { value: "hr_offer_letter", label: "Offer Letter", role: "hr", icon: FileSignature, description: "Employment offer letters" },
  { value: "hr_exit", label: "Exit / Clearance Form", role: "hr", icon: LogOut, description: "Resignation, clearance and relieving" },
  { value: "hr_bonus", label: "Bonus / Incentive Letter", role: "hr", icon: Wallet, description: "Bonus, incentive and appraisal letters" },
  { value: "hr_gratuity", label: "Gratuity / Full & Final", role: "hr", icon: Briefcase, description: "Gratuity and settlement statements" },
  { value: "hr_training", label: "Training / Certification", role: "hr", icon: GraduationCap, description: "Learning plans and certificates" },
  { value: "invoice", label: "Invoice", role: "finance", icon: Receipt, description: "Tax invoices and billing" },
];

/* ---------------------------------------------------------------- themes */

const THEMES = {
  modernBlue: {
    theme: "modern-blue",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
    accentColor: "#60a5fa",
    fontFamily: "Bai Jamjuree",
    headerStyle: "gradient",
    tableStyle: "modern",
    borderRadius: "8px",
  },
  enterpriseNavy: {
    theme: "enterprise-navy",
    primaryColor: "#0f1b3d",
    secondaryColor: "#1e3a5f",
    accentColor: "#c9a84c",
    fontFamily: "Bai Jamjuree",
    headerStyle: "solid",
    tableStyle: "bordered",
    borderRadius: "4px",
  },
  cyberTeal: {
    theme: "cyber-teal",
    primaryColor: "#0d9488",
    secondaryColor: "#0f766e",
    accentColor: "#2dd4bf",
    fontFamily: "Bai Jamjuree",
    headerStyle: "modern",
    tableStyle: "striped",
    borderRadius: "8px",
  },
  technicalGreen: {
    theme: "technical-green",
    primaryColor: "#059669",
    secondaryColor: "#047857",
    accentColor: "#34d399",
    fontFamily: "Bai Jamjuree",
    headerStyle: "minimal",
    tableStyle: "striped",
    borderRadius: "6px",
  },
  executivePurple: {
    theme: "executive-purple",
    primaryColor: "#7c3aed",
    secondaryColor: "#6d28d9",
    accentColor: "#a78bfa",
    fontFamily: "Bai Jamjuree",
    headerStyle: "elegant",
    tableStyle: "modern",
    borderRadius: "12px",
  },
  hrWarm: {
    theme: "people-warm",
    primaryColor: "#c2410c",
    secondaryColor: "#9a3412",
    accentColor: "#fb923c",
    fontFamily: "Bai Jamjuree",
    headerStyle: "boxed",
    tableStyle: "bordered",
    borderRadius: "8px",
  },
  complianceSlate: {
    theme: "compliance-slate",
    primaryColor: "#334155",
    secondaryColor: "#1e293b",
    accentColor: "#94a3b8",
    fontFamily: "Bai Jamjuree",
    headerStyle: "line",
    tableStyle: "bordered",
    borderRadius: "4px",
  },
} as const;

/* -------------------------------------------------------------- helpers */

const sections = (...titles: string[]) => ({
  sections: titles.map((title, i) => ({
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    title,
    required: i < 4,
  })),
});

const fields = (...defs: [string, string][]) => ({
  fields: defs.map(([label, type]) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    label,
    type,
  })),
});

const docHeader = (title: string, extra: Record<string, unknown> = {}) => ({
  showLogo: true,
  logoPosition: "left",
  showCompanyInfo: true,
  showDate: true,
  title,
  ...extra,
});

const docFooter = (extra: Record<string, unknown> = {}) => ({
  showPageNumbers: true,
  showConfidential: true,
  showCompanyInfo: true,
  ...extra,
});

/* ------------------------------------------------------------- catalogue */

export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  /* ============================ SALES – QUOTES ========================== */
  {
    key: "quote-standard",
    name: "Standard Product Quotation",
    description: "General purpose priced quotation with line items, taxes and validity.",
    template_type: "quote",
    role: "sales",
    solution: "General",
    content: fields(
      ["Quote Number", "auto"], ["Quote Date", "date"], ["Valid Until", "date"],
      ["Customer Details", "customer"], ["Solution Summary", "rich_text"],
      ["Line Items", "table"], ["Discounts", "calculated"], ["Taxes", "calculated"],
      ["Total", "calculated"], ["Terms & Conditions", "rich_text"],
    ),
    header_content: docHeader("QUOTATION", { showQuoteValidity: true }),
    footer_content: docFooter({ showTerms: true, showSignature: true, showBankDetails: true }),
    branding: THEMES.modernBlue,
  },
  {
    key: "quote-cybersecurity-licenses",
    name: "Cybersecurity Licence Quotation",
    description: "Licence-based quote with SKU, seat count, term and renewal uplift columns.",
    template_type: "quote",
    role: "sales",
    solution: "Cybersecurity Products",
    content: {
      ...fields(
        ["Quote Number", "auto"], ["Customer Details", "customer"],
        ["Licence Line Items", "table"], ["Term & Renewal", "text"],
        ["Support Tier", "select"], ["Total", "calculated"],
      ),
      columns: ["SKU", "Product", "Seats", "Term (months)", "Unit price", "Total"],
      showRenewalUplift: true,
    },
    header_content: docHeader("LICENCE QUOTATION", { showQuoteValidity: true }),
    footer_content: docFooter({ showTerms: true, showSignature: true }),
    branding: THEMES.cyberTeal,
  },
  {
    key: "quote-managed-security",
    name: "Managed Security Services Quotation",
    description: "Recurring MSS quote with monthly/annual pricing, SLA and coverage matrix.",
    template_type: "quote",
    role: "sales",
    solution: "Managed Security Services",
    content: {
      ...fields(
        ["Quote Number", "auto"], ["Customer Details", "customer"],
        ["Service Scope", "rich_text"], ["Coverage Matrix", "table"],
        ["SLA Commitments", "table"], ["Monthly Charges", "table"],
        ["Annual Contract Value", "calculated"],
      ),
      billingModes: ["monthly", "quarterly", "annual"],
      showSlaMatrix: true,
    },
    header_content: docHeader("MANAGED SERVICES QUOTATION"),
    footer_content: docFooter({ showTerms: true, showSignature: true, showEscalationMatrix: true }),
    branding: THEMES.enterpriseNavy,
  },
  {
    key: "quote-professional-services",
    name: "Professional Services Quotation",
    description: "Effort-based quote with role rate card, man-days and milestone billing.",
    template_type: "quote",
    role: "sales",
    solution: "Professional Services",
    content: {
      ...fields(
        ["Quote Number", "auto"], ["Customer Details", "customer"],
        ["Scope of Work", "rich_text"], ["Rate Card", "table"],
        ["Effort Estimate", "table"], ["Milestone Billing", "table"], ["Total", "calculated"],
      ),
      showRateCard: true,
    },
    header_content: docHeader("SERVICES QUOTATION"),
    footer_content: docFooter({ showTerms: true, showSignature: true }),
    branding: THEMES.technicalGreen,
  },
  {
    key: "quote-offensive-security",
    name: "Offensive Security (VAPT) Quotation",
    description: "Assessment quote with scope units, testing windows and reporting deliverables.",
    template_type: "quote",
    role: "sales",
    solution: "Offensive Security",
    content: {
      ...fields(
        ["Quote Number", "auto"], ["Customer Details", "customer"],
        ["Assessment Scope", "table"], ["Testing Methodology", "rich_text"],
        ["Testing Window", "text"], ["Deliverables", "list"], ["Total", "calculated"],
      ),
      scopeUnits: ["IPs", "Applications", "APIs", "Mobile apps", "Cloud accounts"],
    },
    header_content: docHeader("SECURITY ASSESSMENT QUOTATION"),
    footer_content: docFooter({ showTerms: true, showSignature: true, showNdaNote: true }),
    branding: THEMES.complianceSlate,
  },
  {
    key: "quote-renewal",
    name: "Renewal Quotation",
    description: "Renewal-specific quote showing existing entitlement, uplift and multi-year options.",
    template_type: "quote",
    role: "sales",
    solution: "Renewals",
    content: {
      ...fields(
        ["Existing Entitlement", "table"], ["Renewal Period", "date_range"],
        ["Uplift %", "number"], ["Multi-year Options", "table"], ["Total", "calculated"],
      ),
      showComparisonWithPrevious: true,
    },
    header_content: docHeader("RENEWAL QUOTATION"),
    footer_content: docFooter({ showTerms: true, showSignature: true }),
    branding: THEMES.modernBlue,
  },

  /* =========================== SALES – PROPOSALS ======================== */
  {
    key: "proposal-executive",
    name: "Executive Business Proposal",
    description: "Board-ready proposal focused on outcomes, ROI and risk reduction.",
    template_type: "proposal",
    role: "sales",
    solution: "General",
    content: sections(
      "Cover Page", "Executive Summary", "Understanding of Requirements", "Proposed Solution",
      "Business Outcomes & ROI", "Commercials", "Implementation Timeline", "Why Us", "Next Steps",
    ),
    header_content: docHeader("BUSINESS PROPOSAL", { showCoverPage: true, showTOC: true }),
    footer_content: docFooter(),
    branding: THEMES.executivePurple,
  },
  {
    key: "proposal-cybersecurity",
    name: "Cybersecurity Solution Proposal",
    description: "Threat-led proposal mapping customer risks to product capabilities and controls.",
    template_type: "proposal",
    role: "sales",
    solution: "Cybersecurity Products",
    content: sections(
      "Cover Page", "Executive Summary", "Current Threat Landscape", "Gap Assessment",
      "Proposed Architecture", "Control Mapping (NIST/ISO)", "Deployment Approach",
      "Commercials", "Support Model", "References",
    ),
    header_content: docHeader("SECURITY SOLUTION PROPOSAL", { showCoverPage: true, showTOC: true }),
    footer_content: docFooter(),
    branding: THEMES.cyberTeal,
  },
  {
    key: "proposal-managed-services",
    name: "Managed Services Proposal",
    description: "MSS proposal with service catalogue, SLA, escalation matrix and onboarding plan.",
    template_type: "proposal",
    role: "sales",
    solution: "Managed Security Services",
    content: sections(
      "Cover Page", "Executive Summary", "Service Catalogue", "Operating Model",
      "SLA & KPIs", "Escalation Matrix", "Onboarding Plan", "Reporting & Governance", "Commercials",
    ),
    header_content: docHeader("MANAGED SERVICES PROPOSAL", { showCoverPage: true, showTOC: true }),
    footer_content: docFooter({ showEscalationMatrix: true }),
    branding: THEMES.enterpriseNavy,
  },
  {
    key: "proposal-professional-services",
    name: "Professional Services Proposal",
    description: "Delivery-led proposal with scope, methodology, RACI and acceptance criteria.",
    template_type: "proposal",
    role: "sales",
    solution: "Professional Services",
    content: sections(
      "Cover Page", "Executive Summary", "Scope of Work", "Delivery Methodology",
      "Team & RACI", "Timeline & Milestones", "Assumptions & Dependencies",
      "Acceptance Criteria", "Commercials",
    ),
    header_content: docHeader("SERVICES PROPOSAL", { showCoverPage: true, showTOC: true }),
    footer_content: docFooter(),
    branding: THEMES.technicalGreen,
  },
  {
    key: "rfp-response-standard",
    name: "RFP / Tender Response Pack",
    description: "Compliance-matrix driven bid response for government and enterprise tenders.",
    template_type: "rfp_response",
    role: "sales",
    solution: "Tenders",
    content: sections(
      "Bid Covering Letter", "Eligibility Compliance", "Technical Compliance Matrix",
      "Solution Response", "Past Performance & References", "Commercial Bid",
      "Deviations", "Annexures & Certificates",
    ),
    header_content: docHeader("RFP RESPONSE", { showCoverPage: true, showTOC: true, showTenderNumber: true }),
    footer_content: docFooter({ showBidValidity: true, showSignature: true }),
    branding: THEMES.complianceSlate,
  },

  /* ============================== PRESALES ============================= */
  {
    key: "poc-standard",
    name: "Standard POC Plan",
    description: "Baseline POC plan with objectives, success criteria, timeline and exit gates.",
    template_type: "poc_plan",
    role: "presales",
    solution: "General",
    content: sections(
      "Overview", "POC Objectives", "Success Criteria", "Scope & Use Cases",
      "Environment & Prerequisites", "Timeline & Milestones", "Roles & Responsibilities",
      "Risks & Mitigation", "Exit Criteria",
    ),
    header_content: docHeader("PROOF OF CONCEPT PLAN", { showVersion: true }),
    footer_content: docFooter(),
    branding: THEMES.modernBlue,
  },
  {
    key: "poc-endpoint-security",
    name: "Endpoint Security POC Plan",
    description: "POC plan tuned for EDR/XDR pilots: agent rollout, detection tests and tuning.",
    template_type: "poc_plan",
    role: "presales",
    solution: "Endpoint Security",
    content: sections(
      "Overview", "Pilot Group & Agent Rollout", "Detection Test Cases", "Attack Simulation Scenarios",
      "False Positive Tuning", "Performance Impact", "Reporting & Dashboards", "Exit Criteria",
    ),
    header_content: docHeader("ENDPOINT SECURITY POC PLAN", { showVersion: true }),
    footer_content: docFooter(),
    branding: THEMES.cyberTeal,
  },
  {
    key: "poc-network-cloud",
    name: "Network & Cloud Security POC Plan",
    description: "POC plan for firewall, SASE and cloud posture pilots with traffic and policy tests.",
    template_type: "poc_plan",
    role: "presales",
    solution: "Network & Cloud Security",
    content: sections(
      "Overview", "Topology & Integration Points", "Policy Test Cases", "Traffic & Throughput Tests",
      "Cloud Posture Findings", "High Availability Validation", "Operational Readiness", "Exit Criteria",
    ),
    header_content: docHeader("NETWORK & CLOUD POC PLAN", { showVersion: true, showTopologyDiagram: true }),
    footer_content: docFooter(),
    branding: THEMES.technicalGreen,
  },
  {
    key: "poc-report",
    name: "POC Outcome Report",
    description: "Evidence-backed POC result report with scoring against agreed success criteria.",
    template_type: "poc_report",
    role: "presales",
    solution: "General",
    content: {
      ...sections(
        "Executive Summary", "Success Criteria Scorecard", "Test Results & Evidence",
        "Observations", "Gaps & Workarounds", "Recommendation", "Proposed Next Steps",
      ),
      showScorecard: true,
    },
    header_content: docHeader("POC OUTCOME REPORT", { showVersion: true }),
    footer_content: docFooter(),
    branding: THEMES.executivePurple,
  },
  {
    key: "solution-design-hld-lld",
    name: "Solution Design (HLD + LLD)",
    description: "Combined high and low level design with architecture, integrations and sizing.",
    template_type: "solution_design",
    role: "presales",
    solution: "General",
    content: sections(
      "Business Context", "High Level Architecture", "Low Level Design", "Integration Matrix",
      "Sizing & Capacity", "Security & Compliance Considerations", "Assumptions", "Design Sign-off",
    ),
    header_content: docHeader("SOLUTION DESIGN DOCUMENT", { showVersion: true, showTOC: true }),
    footer_content: docFooter({ showRevisionHistory: true }),
    branding: THEMES.enterpriseNavy,
  },

  /* ============================== TECHNICAL ============================ */
  {
    key: "implementation-standard",
    name: "Standard Implementation Plan",
    description: "Phase-wise rollout plan with milestones, RACI and acceptance criteria.",
    template_type: "implementation_plan",
    role: "technical",
    solution: "General",
    content: {
      ...sections(
        "Executive Summary", "Customer Environment", "Solution Architecture", "Implementation Phases",
        "Milestones & Timeline", "RACI Matrix", "Dependencies", "Rollback Plan", "Acceptance Criteria",
      ),
      showGanttChart: true,
    },
    header_content: docHeader("IMPLEMENTATION PLAN", { showProjectName: true, showVersion: true }),
    footer_content: docFooter({ showRevisionHistory: true }),
    branding: THEMES.technicalGreen,
  },
  {
    key: "implementation-migration",
    name: "Migration & Cutover Plan",
    description: "Cutover runsheet with pre-checks, timed activities, rollback and go/no-go gates.",
    template_type: "implementation_plan",
    role: "technical",
    solution: "Migration",
    content: {
      ...sections(
        "Migration Overview", "Pre-migration Checklist", "Cutover Runsheet", "Go / No-Go Criteria",
        "Rollback Procedure", "Post-migration Validation", "Hypercare Plan",
      ),
      showTimedRunsheet: true,
    },
    header_content: docHeader("MIGRATION & CUTOVER PLAN", { showVersion: true }),
    footer_content: docFooter({ showRevisionHistory: true }),
    branding: THEMES.complianceSlate,
  },
  {
    key: "runbook-operations",
    name: "Operational Runbook / SOP",
    description: "Step-by-step operational procedures with escalation paths and health checks.",
    template_type: "runbook",
    role: "technical",
    solution: "Operations",
    content: sections(
      "Purpose & Scope", "System Overview", "Daily Health Checks", "Standard Procedures",
      "Incident Handling", "Escalation Matrix", "Backup & Recovery", "Contacts",
    ),
    header_content: docHeader("OPERATIONAL RUNBOOK", { showVersion: true }),
    footer_content: docFooter({ showRevisionHistory: true }),
    branding: THEMES.technicalGreen,
  },
  {
    key: "handover-support",
    name: "Project to Support Handover",
    description: "Formal handover pack covering configuration, known issues and support ownership.",
    template_type: "handover_document",
    role: "technical",
    solution: "Support Transition",
    content: sections(
      "Project Summary", "Delivered Scope", "As-built Configuration", "Credentials & Access Register",
      "Known Issues & Workarounds", "Support Model & SLA", "Escalation Contacts", "Handover Sign-off",
    ),
    header_content: docHeader("HANDOVER DOCUMENT", { showVersion: true }),
    footer_content: docFooter({ showSignature: true }),
    branding: THEMES.enterpriseNavy,
  },

  /* ================================== HR =============================== */
  {
    key: "hr-new-joinee",
    name: "New Joinee Information Form",
    description: "Joining form capturing personal, statutory, banking and emergency details.",
    template_type: "hr_onboarding",
    role: "hr",
    content: fields(
      ["Employee Name", "text"], ["Designation", "text"], ["Department", "select"],
      ["Date of Joining", "date"], ["Reporting Manager", "employee"],
      ["Date of Birth", "date"], ["Permanent Address", "textarea"], ["Current Address", "textarea"],
      ["PAN Number", "text"], ["Aadhaar Number", "text"], ["UAN / PF Number", "text"],
      ["Bank Account Number", "text"], ["IFSC Code", "text"],
      ["Emergency Contact Name", "text"], ["Emergency Contact Number", "text"],
      ["Blood Group", "text"], ["Previous Employer", "text"], ["Declaration & Signature", "signature"],
    ),
    header_content: docHeader("NEW JOINEE INFORMATION FORM", { showEmployeePhoto: true }),
    footer_content: docFooter({ showSignature: true, showHrSignature: true }),
    branding: THEMES.hrWarm,
  },
  {
    key: "hr-onboarding-checklist",
    name: "Onboarding Checklist & Induction Plan",
    description: "Day-1 to day-90 induction plan with asset issue, access and training checkpoints.",
    template_type: "hr_onboarding",
    role: "hr",
    content: sections(
      "Pre-joining Documentation", "Day 1 Induction", "Asset & Access Issuance",
      "Policy Acknowledgements", "30-60-90 Day Plan", "Buddy & Mentor Assignment", "Probation Review",
    ),
    header_content: docHeader("ONBOARDING CHECKLIST"),
    footer_content: docFooter({ showSignature: true }),
    branding: THEMES.hrWarm,
  },
  {
    key: "hr-offer-letter",
    name: "Offer Letter & Appointment Letter",
    description: "Offer with compensation breakup, joining conditions and statutory annexures.",
    template_type: "hr_offer_letter",
    role: "hr",
    content: sections(
      "Offer Summary", "Compensation Breakup (CTC)", "Joining Conditions", "Probation & Confirmation",
      "Leave & Benefits", "Confidentiality & IP", "Notice Period", "Acceptance",
    ),
    header_content: docHeader("LETTER OF APPOINTMENT", { logoPosition: "center" }),
    footer_content: docFooter({ showSignature: true, showHrSignature: true }),
    branding: THEMES.enterpriseNavy,
  },
  {
    key: "hr-exit-form",
    name: "Exit / Resignation & Clearance Form",
    description: "Resignation acceptance with department-wise clearance and asset return tracking.",
    template_type: "hr_exit",
    role: "hr",
    content: {
      ...fields(
        ["Employee Name", "text"], ["Employee Code", "text"], ["Department", "select"],
        ["Date of Resignation", "date"], ["Last Working Day", "date"], ["Reason for Leaving", "textarea"],
        ["Notice Period Served", "text"], ["Asset Return Checklist", "table"],
        ["IT Access Revocation", "checklist"], ["Finance Clearance", "approval"],
        ["Manager Clearance", "approval"], ["HR Clearance", "approval"],
      ),
      clearanceDepartments: ["Reporting Manager", "IT", "Admin", "Finance", "HR"],
    },
    header_content: docHeader("EXIT & CLEARANCE FORM"),
    footer_content: docFooter({ showSignature: true, showHrSignature: true }),
    branding: THEMES.complianceSlate,
  },
  {
    key: "hr-exit-interview",
    name: "Exit Interview Questionnaire",
    description: "Structured exit interview capturing sentiment, drivers and retention learnings.",
    template_type: "hr_exit",
    role: "hr",
    content: sections(
      "Reason for Leaving", "Role & Workload Experience", "Manager & Team Feedback",
      "Compensation & Growth", "Culture & Wellbeing", "Would You Rejoin", "Suggestions",
    ),
    header_content: docHeader("EXIT INTERVIEW"),
    footer_content: docFooter({ showConfidential: true }),
    branding: THEMES.hrWarm,
  },
  {
    key: "hr-relieving-letter",
    name: "Relieving & Experience Letter",
    description: "Relieving letter with tenure, designation history and conduct statement.",
    template_type: "hr_exit",
    role: "hr",
    content: sections("Employment Confirmation", "Tenure & Designations", "Conduct Statement", "Relieving Declaration"),
    header_content: docHeader("RELIEVING & EXPERIENCE LETTER", { logoPosition: "center" }),
    footer_content: docFooter({ showSignature: true, showHrSignature: true }),
    branding: THEMES.enterpriseNavy,
  },
  {
    key: "hr-bonus-letter",
    name: "Bonus / Incentive Award Letter",
    description: "Performance or statutory bonus letter with calculation basis and payout schedule.",
    template_type: "hr_bonus",
    role: "hr",
    content: fields(
      ["Employee Name", "text"], ["Employee Code", "text"], ["Assessment Period", "date_range"],
      ["Performance Rating", "select"], ["Bonus Type", "select"], ["Calculation Basis", "textarea"],
      ["Gross Bonus Amount", "currency"], ["Tax Deducted", "currency"], ["Net Payable", "calculated"],
      ["Payout Date", "date"], ["Authorised Signatory", "signature"],
    ),
    header_content: docHeader("BONUS AWARD LETTER"),
    footer_content: docFooter({ showSignature: true, showConfidential: true }),
    branding: THEMES.hrWarm,
  },
  {
    key: "hr-incentive-plan",
    name: "Sales Incentive Plan Letter",
    description: "Quota, accelerator and payout-schedule letter for quota-carrying employees.",
    template_type: "hr_bonus",
    role: "hr",
    content: sections(
      "Plan Period", "Quota & Targets", "Commission Slabs", "Accelerators & Caps",
      "Payout Schedule", "Clawback Conditions", "Acceptance",
    ),
    header_content: docHeader("INCENTIVE PLAN LETTER"),
    footer_content: docFooter({ showSignature: true, showConfidential: true }),
    branding: THEMES.modernBlue,
  },
  {
    key: "hr-gratuity-form",
    name: "Gratuity Application & Computation (Form I)",
    description: "Gratuity claim with eligibility check and 15/26 days-wage statutory computation.",
    template_type: "hr_gratuity",
    role: "hr",
    content: {
      ...fields(
        ["Employee Name", "text"], ["Employee Code", "text"], ["Date of Joining", "date"],
        ["Date of Leaving", "date"], ["Total Years of Service", "calculated"],
        ["Last Drawn Basic + DA", "currency"], ["Gratuity Formula", "text"],
        ["Computed Gratuity", "calculated"], ["Nominee Details", "textarea"],
        ["Payment Mode", "select"], ["Authorised Signatory", "signature"],
      ),
      formula: "(Last drawn Basic + DA) x 15 / 26 x completed years of service",
      eligibilityYears: 5,
      statutoryReference: "Payment of Gratuity Act, 1972",
    },
    header_content: docHeader("GRATUITY APPLICATION & COMPUTATION"),
    footer_content: docFooter({ showSignature: true, showStatutoryNote: true }),
    branding: THEMES.complianceSlate,
  },
  {
    key: "hr-full-and-final",
    name: "Full & Final Settlement Statement",
    description: "Settlement statement netting salary, leave encashment, gratuity and recoveries.",
    template_type: "hr_gratuity",
    role: "hr",
    content: {
      ...fields(
        ["Employee Name", "text"], ["Last Working Day", "date"],
        ["Pending Salary", "currency"], ["Leave Encashment", "currency"],
        ["Gratuity Payable", "currency"], ["Bonus / Incentive Due", "currency"],
        ["Notice Period Recovery", "currency"], ["Asset Loss Recovery", "currency"],
        ["Loan / Advance Recovery", "currency"], ["Tax Deducted", "currency"],
        ["Net Settlement", "calculated"],
      ),
      showEarningsDeductionsSplit: true,
    },
    header_content: docHeader("FULL & FINAL SETTLEMENT"),
    footer_content: docFooter({ showSignature: true, showHrSignature: true }),
    branding: THEMES.enterpriseNavy,
  },
  {
    key: "hr-leave-travel-form",
    name: "Leave, WFH & Travel Request Form",
    description: "Combined request form with approval chain and reimbursement declaration.",
    template_type: "hr_onboarding",
    role: "hr",
    content: fields(
      ["Employee Name", "text"], ["Request Type", "select"], ["From Date", "date"], ["To Date", "date"],
      ["Reason", "textarea"], ["Handover To", "employee"], ["Travel Itinerary", "table"],
      ["Advance Requested", "currency"], ["Manager Approval", "approval"], ["HR Approval", "approval"],
    ),
    header_content: docHeader("EMPLOYEE REQUEST FORM"),
    footer_content: docFooter({ showSignature: true }),
    branding: THEMES.hrWarm,
  },
  {
    key: "hr-appraisal-form",
    name: "Performance Appraisal & PIP Form",
    description: "Goal-based appraisal with competency ratings and improvement-plan section.",
    template_type: "hr_training",
    role: "hr",
    content: sections(
      "Review Period", "Goal Achievement", "Competency Ratings", "Manager Feedback",
      "Employee Self-assessment", "Development Plan", "Improvement Plan (if applicable)", "Sign-off",
    ),
    header_content: docHeader("PERFORMANCE APPRAISAL"),
    footer_content: docFooter({ showSignature: true, showConfidential: true }),
    branding: THEMES.executivePurple,
  },
  {
    key: "hr-training-certificate",
    name: "Training Completion Certificate",
    description: "Certificate of completion with course, hours, score and validity.",
    template_type: "hr_training",
    role: "hr",
    content: fields(
      ["Employee Name", "text"], ["Course Title", "text"], ["Training Hours", "number"],
      ["Assessment Score", "number"], ["Completion Date", "date"], ["Valid Until", "date"],
      ["Authorised Signatory", "signature"],
    ),
    header_content: docHeader("CERTIFICATE OF COMPLETION", { logoPosition: "center", showBorderArt: true }),
    footer_content: { showSignature: true, showSeal: true },
    branding: THEMES.executivePurple,
  },

  /* ================================ FINANCE ============================ */
  {
    key: "invoice-gst",
    name: "GST Tax Invoice",
    description: "India-compliant tax invoice with HSN/SAC, GST split and IRN placeholder.",
    template_type: "invoice",
    role: "finance",
    content: {
      ...fields(
        ["Invoice Number", "auto"], ["Invoice Date", "date"], ["Due Date", "date"],
        ["Customer Details", "customer"], ["Place of Supply", "text"], ["Line Items", "table"],
        ["CGST / SGST / IGST", "calculated"], ["Total", "calculated"], ["Amount in Words", "calculated"],
      ),
      columns: ["Description", "HSN/SAC", "Qty", "Rate", "Taxable value", "GST %", "Amount"],
      showIRNQr: true,
    },
    header_content: docHeader("TAX INVOICE", { showGstin: true }),
    footer_content: docFooter({ showBankDetails: true, showTerms: true, showSignature: true }),
    branding: THEMES.modernBlue,
  },
  {
    key: "invoice-proforma",
    name: "Proforma Invoice",
    description: "Advance/proforma invoice used for PO issuance and payment collection.",
    template_type: "invoice",
    role: "finance",
    content: fields(
      ["Proforma Number", "auto"], ["Date", "date"], ["Customer Details", "customer"],
      ["Line Items", "table"], ["Advance Payable", "calculated"], ["Payment Terms", "text"],
    ),
    header_content: docHeader("PROFORMA INVOICE", { showGstin: true }),
    footer_content: docFooter({ showBankDetails: true, showTerms: true }),
    branding: THEMES.cyberTeal,
  },
];

/* ------------------------------------------------------- branding merge */

export interface TenantBrandingInput {
  companyName?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

/**
 * Merges tenant branding into a library template's branding block so installed
 * templates always render with the tenant's identity, while keeping the
 * template's own palette when the tenant has not defined brand colours.
 */
export function applyTenantBranding(
  template: LibraryTemplate,
  tenant: TenantBrandingInput,
): Record<string, unknown> {
  return {
    ...template.branding,
    ...(tenant.primaryColor ? { primaryColor: tenant.primaryColor } : {}),
    ...(tenant.secondaryColor ? { secondaryColor: tenant.secondaryColor } : {}),
    ...(tenant.accentColor ? { accentColor: tenant.accentColor } : {}),
    tenantBranded: true,
    companyName: tenant.companyName ?? null,
    logoUrl: tenant.logoUrl ?? null,
    companyAddress: tenant.address ?? null,
    companyEmail: tenant.email ?? null,
    companyPhone: tenant.phone ?? null,
    companyWebsite: tenant.website ?? null,
  };
}

export const TEMPLATE_TYPE_MAP = new Map(TEMPLATE_TYPES.map((t) => [t.value, t]));

export function templatesForRole(role: TemplateRole | "all"): LibraryTemplate[] {
  return role === "all" ? TEMPLATE_LIBRARY : TEMPLATE_LIBRARY.filter((t) => t.role === role);
}

export const DEFAULT_TEMPLATE_CONTENT: Record<string, Record<string, unknown>> =
  TEMPLATE_LIBRARY.reduce((acc, t) => {
    if (!acc[t.template_type]) acc[t.template_type] = t.content;
    return acc;
  }, {} as Record<string, Record<string, unknown>>);
