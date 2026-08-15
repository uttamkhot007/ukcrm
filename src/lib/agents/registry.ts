import {
  Bot,
  Calculator,
  FileText,
  Gavel,
  HeartHandshake,
  LifeBuoy,
  PieChart,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AgentSkill {
  label: string;
  prompt: string;
}

export interface AgentMeta {
  key: string;
  name: string;
  tagline: string;
  /** App module this agent is embedded in. */
  module: string;
  icon: LucideIcon;
  /** Tailwind token-based accent (never hardcoded colors). */
  accent: string;
  skills: AgentSkill[];
}

export const AGENTS: AgentMeta[] = [
  {
    key: "document",
    name: "Document Agent",
    tagline: "Implementation guides, SOWs, proposals and policies — client-ready.",
    module: "documents",
    icon: FileText,
    accent: "text-primary",
    skills: [
      {
        label: "ISO 27001 implementation guide",
        prompt:
          "Prepare a phase-wise ISO 27001 implementation guide for the client, covering scope, gap assessment, Annexure A control mapping, timelines, owners, deliverables and acceptance criteria.",
      },
      {
        label: "SAMA / regulatory guide",
        prompt:
          "Prepare a SAMA Cyber Security Framework implementation guide with domain-by-domain control mapping, maturity targets, phased roadmap and evidence checklist.",
      },
      {
        label: "Statement of Work",
        prompt:
          "Draft a Statement of Work for the selected engagement: scope, out-of-scope, deliverables, milestones, effort, assumptions, RACI and commercial terms.",
      },
      {
        label: "Solution proposal",
        prompt:
          "Draft a solution proposal using our offerings for this account, including problem statement, proposed architecture, BOM, benefits and pricing structure.",
      },
    ],
  },
  {
    key: "tender",
    name: "Tender Agent",
    tagline: "Reads the tender, builds the compliance matrix, calls bid / no-bid.",
    module: "tenders",
    icon: Gavel,
    accent: "text-amber-500",
    skills: [
      {
        label: "Analyse attached tender",
        prompt:
          "Analyse the attached tender document: extract authority, dates, EMD, eligibility, technical scope, evaluation method and penalties, then build a compliance matrix and a bid/no-bid recommendation.",
      },
      {
        label: "Compliance matrix",
        prompt:
          "Build a requirement-by-requirement compliance matrix for this tender mapping each clause to Comply / Partially Comply / Deviation with our supporting evidence.",
      },
      {
        label: "Bid response skeleton",
        prompt:
          "Produce the bid response skeleton with every required section, the owner for each, page limits and a dated submission checklist.",
      },
      {
        label: "Bid / no-bid score",
        prompt:
          "Score this opportunity out of 100 on fit, eligibility, competition, margin and delivery risk, and give a clear bid or no-bid recommendation with reasoning.",
      },
    ],
  },
  {
    key: "accounting",
    name: "Accounting Agent",
    tagline: "Books, GST, TDS, ageing and month-end close — with the workings shown.",
    module: "finance",
    icon: Calculator,
    accent: "text-emerald-500",
    skills: [
      {
        label: "AR ageing & collection plan",
        prompt:
          "Analyse receivables: ageing buckets, top overdue accounts, DSO trend, and a prioritised collection plan with chase notes per account.",
      },
      {
        label: "GST position",
        prompt:
          "Summarise this period's GST position: output vs input tax, ineligible credits, mismatches, and the GSTR-1/3B filing checklist.",
      },
      {
        label: "TDS/TCS compliance",
        prompt:
          "Review TDS/TCS transactions for the period: section-wise deduction, deposit status, shortfalls and the compliance actions needed.",
      },
      {
        label: "Month-end close pack",
        prompt:
          "Produce the month-end close pack: P&L highlights, ratio analysis with commentary, reconciliation gaps and a close checklist.",
      },
    ],
  },
  {
    key: "reporting",
    name: "Reporting Agent",
    tagline: "Monthly client summaries, QBR packs and board reports from live data.",
    module: "reports",
    icon: PieChart,
    accent: "text-sky-500",
    skills: [
      {
        label: "Monthly security summary",
        prompt:
          "Build this month's cyber security summary for the customer: KPI band, incidents by severity, SLA performance, open actions and recommendations for next month.",
      },
      {
        label: "Project status dashboard",
        prompt:
          "Build a project summary dashboard: milestone status, schedule variance, task burndown, risks, blockers and owner-wise open actions.",
      },
      {
        label: "Executive / board report",
        prompt:
          "Prepare the executive report: revenue and pipeline KPIs, delivery performance, people metrics, risks and the decisions needed from leadership.",
      },
      {
        label: "QBR pack",
        prompt:
          "Prepare a quarterly business review pack for this account: value delivered, consumption, SLA record, roadmap and expansion opportunities.",
      },
    ],
  },
  {
    key: "sales",
    name: "Sales MEDDIC Agent",
    tagline: "Qualification gaps, deal risk and the next action that actually moves it.",
    module: "sales",
    icon: HeartHandshake,
    accent: "text-sales",
    skills: [
      {
        label: "Score this deal (MEDDIC)",
        prompt:
          "Score this deal element-by-element on MEDDIC with evidence, name the biggest gap, and give the next action with owner and date.",
      },
      {
        label: "Pipeline risk review",
        prompt:
          "Review the open pipeline: flag deals at risk, stalled stages, missing champions and unrealistic close dates, then rank by recoverable value.",
      },
      {
        label: "Objection handling script",
        prompt:
          "Write an objection handling script for the likeliest pushback on this deal, with proof points from our offerings.",
      },
    ],
  },
  {
    key: "support",
    name: "Support Agent",
    tagline: "Triage, RCA drafts and customer-ready replies within SLA.",
    module: "support",
    icon: LifeBuoy,
    accent: "text-support",
    skills: [
      {
        label: "Triage open tickets",
        prompt:
          "Triage the open tickets by severity and SLA exposure, flag likely breaches and recommend the escalation tier for each.",
      },
      {
        label: "Draft RCA",
        prompt:
          "Draft a root cause analysis for this ticket: timeline, impact, root cause, corrective action and prevention.",
      },
      {
        label: "Customer reply",
        prompt: "Write a calm, factual customer-facing update for this ticket with clear next steps and timelines.",
      },
    ],
  },
  {
    key: "hr",
    name: "HR Agent",
    tagline: "JDs, interview kits, letters and India-compliant HR policy drafting.",
    module: "hr",
    icon: Users,
    accent: "text-hr",
    skills: [
      {
        label: "Job description",
        prompt: "Write a job description and interview scorecard for this role, with must-have and nice-to-have criteria.",
      },
      {
        label: "Onboarding plan",
        prompt: "Prepare a 30-60-90 day onboarding plan for this role, with checkpoints, owners and success measures.",
      },
      {
        label: "HR policy draft",
        prompt: "Draft the HR policy requested, compliant with Indian labour law, with scope, rules, exceptions and enforcement.",
      },
    ],
  },
  {
    key: "orchestrator",
    name: "Orchestrator",
    tagline: "Not sure who to ask? Describe the outcome and it routes the work.",
    module: "all",
    icon: Bot,
    accent: "text-primary",
    skills: [
      {
        label: "Just tell it what you need",
        prompt: "Here is what I need: ",
      },
    ],
  },
];

export function getAgentMeta(key: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.key === key);
}

/** Agents surfaced inside a given app module (orchestrator is always last). */
export function agentsForModule(module: string): AgentMeta[] {
  const scoped = AGENTS.filter((a) => a.module === module);
  const orchestrator = AGENTS.find((a) => a.key === "orchestrator")!;
  return scoped.length ? [...scoped, orchestrator] : [orchestrator];
}
