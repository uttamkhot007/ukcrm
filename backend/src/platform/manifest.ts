/**
 * Service manifest — the single source of truth for the microservice topology.
 *
 * Every deployable service declares:
 *  - the bounded context it owns
 *  - the data it owns (table patterns; no other service may read/write them)
 *  - the HTTP surface the gateway routes to it
 *  - its scaling envelope and SLO targets
 *
 * Adding a table without assigning an owner is a build-time failure
 * (see `assertFullTableOwnership`), which keeps the boundaries honest.
 */

export type ServiceName =
  | 'gateway'
  | 'identity'
  | 'tenancy'
  | 'crm'
  | 'sales'
  | 'presales'
  | 'billing'
  | 'accounting'
  | 'taxation'
  | 'inventory'
  | 'hr'
  | 'expenses'
  | 'assets'
  | 'projects'
  | 'support'
  | 'compliance'
  | 'marketing'
  | 'collaboration'
  | 'files'
  | 'integrations'
  | 'ai'
  | 'workflow';

export interface ScalingPolicy {
  /** Minimum running tasks (never scale below this). */
  min: number;
  /** Hard ceiling for autoscaling. */
  max: number;
  /** vCPU units per task (1024 = 1 vCPU). */
  cpu: number;
  /** MiB of memory per task. */
  memory: number;
  /** Average CPU % that triggers scale-out. */
  targetCpuPercent: number;
}

export interface ServiceSlo {
  /** Availability objective over a 30 day window. */
  availability: number;
  /** p99 latency budget in milliseconds for the service's own handlers. */
  latencyP99Ms: number;
  /** Maximum acceptable 5xx ratio before the error budget burns. */
  errorRatio: number;
}

export interface ServiceDefinition {
  name: ServiceName;
  /** Human-readable bounded context. */
  domain: string;
  description: string;
  /** Default local port (also the container port). */
  port: number;
  /**
   * Logical database this service owns. In production each maps to its own
   * database (database-per-service); locally they map to schemas in one
   * cluster so developers keep a single Postgres.
   */
  database: string;
  /** Table name patterns this service owns exclusively. */
  owns: RegExp[];
  /** Non-CRUD route modules mounted by this service. */
  customRoutes: string[];
  /** Domain events this service publishes. */
  publishes: string[];
  /** Domain events this service consumes. */
  consumes: string[];
  scaling: ScalingPolicy;
  slo: ServiceSlo;
  /** Stateless services can be drained instantly; stateful ones need longer. */
  drainSeconds: number;
}

const defaultSlo: ServiceSlo = { availability: 99.9, latencyP99Ms: 400, errorRatio: 0.001 };
const smallScale: ScalingPolicy = { min: 2, max: 8, cpu: 256, memory: 512, targetCpuPercent: 65 };
const mediumScale: ScalingPolicy = { min: 2, max: 20, cpu: 512, memory: 1024, targetCpuPercent: 60 };
const largeScale: ScalingPolicy = { min: 3, max: 40, cpu: 1024, memory: 2048, targetCpuPercent: 55 };

export const SERVICES: ServiceDefinition[] = [
  {
    name: 'gateway',
    domain: 'Edge',
    description: 'Public API edge: authn, rate limiting, routing, circuit breaking, aggregation.',
    port: 3000,
    database: 'none',
    owns: [],
    customRoutes: [],
    publishes: [],
    consumes: [],
    scaling: largeScale,
    slo: { availability: 99.95, latencyP99Ms: 150, errorRatio: 0.0005 },
    drainSeconds: 20,
  },
  {
    name: 'identity',
    domain: 'Identity & Access',
    description: 'Users, profiles, roles, teams, sessions, authorized domains.',
    port: 3011,
    database: 'identity',
    owns: [/^profiles$/, /^user_roles$/, /^user_teams$/, /^employee_sales_teams$/, /^authorized_domains$/, /^push_subscriptions$/],
    customRoutes: ['auth', 'users-admin', 'authorized-domains'],
    publishes: ['identity.user.created', 'identity.user.role_changed', 'identity.user.deactivated'],
    consumes: ['tenancy.tenant.suspended'],
    scaling: largeScale,
    slo: { availability: 99.95, latencyP99Ms: 250, errorRatio: 0.0005 },
    drainSeconds: 30,
  },
  {
    name: 'tenancy',
    domain: 'Tenancy & Licensing',
    description: 'Tenants, members, modules, licences, plans, data residency, platform status.',
    port: 3012,
    database: 'tenancy',
    owns: [
      /^tenants?$/, /^tenant_/, /^module_definitions$/, /^license_plans?$/, /^license_plan_modules$/,
      /^organization_settings$/, /^platform_integrations$/, /^tenant_clusters$/,
    ],
    customRoutes: ['platform-status'],
    publishes: ['tenancy.tenant.created', 'tenancy.tenant.suspended', 'tenancy.module.toggled'],
    consumes: [],
    scaling: mediumScale,
    slo: { availability: 99.95, latencyP99Ms: 250, errorRatio: 0.0005 },
    drainSeconds: 30,
  },
  {
    name: 'crm',
    domain: 'Customer Records',
    description: 'Contacts, leads, alliance organisations and everything account-shaped.',
    port: 3013,
    database: 'crm',
    owns: [
      /^contacts$/, /^contact_/, /^leads$/, /^alliance_/, /^organization_(?!settings|support)/,
      /^distributors$/, /^media_contacts$/,
    ],
    customRoutes: ['contacts', 'organizations'],
    publishes: ['crm.contact.created', 'crm.lead.converted'],
    consumes: ['sales.deal.won'],
    scaling: largeScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'sales',
    domain: 'Revenue',
    description: 'Deals, MEDDIC pipeline, quotations, estimates, targets, territories, forecasts.',
    port: 3014,
    database: 'sales',
    owns: [
      /^deals$/, /^deal_/, /^quotations?$/, /^quotation_items$/, /^estimates$/, /^estimate_items$/,
      /^sales_/, /^inside_sales_/, /^rotten_deal_settings$/, /^renewals$/, /^tenders?$/, /^tender_/,
      /^product_catalog$/, /^product_(oems|technologies|recommendation_steps)$/, /^offerings?_/, /^oem_technologies$/,
      /^offering_problem_area_mappings$/, /^sops$/, /^sop_/,
    ],
    customRoutes: ['deals'],
    publishes: ['sales.deal.stage_changed', 'sales.deal.won', 'sales.deal.lost', 'sales.quotation.accepted'],
    consumes: ['crm.contact.created'],
    scaling: largeScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'presales',
    domain: 'Solutioning',
    description: 'POCs, RFPs, demos, technical assessments, solution documentation.',
    port: 3015,
    database: 'presales',
    owns: [
      /^poc_/, /^rfp_/, /^demo_/, /^technical_assessments$/, /^presales_/, /^solution_/,
    ],
    customRoutes: [],
    publishes: ['presales.poc.completed', 'presales.rfp.submitted'],
    consumes: ['sales.deal.stage_changed'],
    scaling: mediumScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'billing',
    domain: 'Billing & Receivables',
    description: 'Invoices, invoice items, payments, e-invoicing hand-off, order processing.',
    port: 3016,
    database: 'billing',
    owns: [
      /^invoices$/, /^invoice_items$/, /^payment_records$/, /^e_invoices$/, /^order_processing_requests$/,
      /^accounts_workflow/, /^post_sale_workflow/, /^customer_deliveries$/,
    ],
    customRoutes: [],
    publishes: ['billing.invoice.issued', 'billing.payment.received'],
    consumes: ['sales.deal.won'],
    scaling: mediumScale,
    slo: { availability: 99.95, latencyP99Ms: 400, errorRatio: 0.0005 },
    drainSeconds: 45,
  },
  {
    name: 'accounting',
    domain: 'Books',
    description: 'Ledgers, vouchers, day book, budgets, fiscal years, bank reconciliation.',
    port: 3017,
    database: 'accounting',
    owns: [
      /^account_groups$/, /^ledger_/, /^voucher/, /^day_book_/, /^budgets?$/, /^budget_items$/,
      /^fiscal_years$/, /^bank_reconciliation$/, /^cost_centers$/, /^currencies$/, /^exchange_rate_history$/,
    ],
    customRoutes: ['exchange-rates'],
    publishes: ['accounting.voucher.posted'],
    consumes: ['billing.invoice.issued', 'billing.payment.received'],
    scaling: mediumScale,
    slo: { availability: 99.95, latencyP99Ms: 500, errorRatio: 0.0005 },
    drainSeconds: 60,
  },
  {
    name: 'taxation',
    domain: 'Statutory',
    description: 'GST, TDS/TCS, HSN/SAC, e-way bills and statutory returns.',
    port: 3018,
    database: 'taxation',
    owns: [/^gst_/, /^tds_tcs_/, /^hsn_sac_master$/, /^eway_bills$/],
    customRoutes: [],
    publishes: ['taxation.return.filed'],
    consumes: ['billing.invoice.issued'],
    scaling: smallScale,
    slo: defaultSlo,
    drainSeconds: 45,
  },
  {
    name: 'inventory',
    domain: 'Supply',
    description: 'Stock, godowns, inventory movements and procurement.',
    port: 3019,
    database: 'inventory',
    owns: [/^stock_/, /^godowns$/, /^inventory_/, /^procurement/, /^purchase_/],
    customRoutes: [],
    publishes: ['inventory.stock.moved'],
    consumes: ['billing.invoice.issued'],
    scaling: smallScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'hr',
    domain: 'People',
    description: 'Employees, leave, attendance, hiring, onboarding and offboarding.',
    port: 3020,
    database: 'hr',
    owns: [
      /^employee_(?!sales_teams)/, /^leave_/, /^attendance/, /^job_/, /^offer_letters$/, /^interview_/,
      /^onboarding_/, /^resignation_/, /^hr_/, /^contractors$/, /^approval_workflows$/,
    ],
    customRoutes: [],
    publishes: ['hr.employee.joined', 'hr.employee.exited', 'hr.leave.approved'],
    consumes: ['identity.user.created'],
    scaling: mediumScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'expenses',
    domain: 'Spend',
    description: 'Expense reports, expense items, travel requests and bookings.',
    port: 3021,
    database: 'expenses',
    owns: [/^expense_/, /^travel_/],
    customRoutes: [],
    publishes: ['expenses.report.approved'],
    consumes: ['hr.employee.exited'],
    scaling: smallScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'assets',
    domain: 'IT Assets',
    description: 'Asset register, categories, assignments and maintenance.',
    port: 3022,
    database: 'assets',
    owns: [/^assets$/, /^asset_/],
    customRoutes: [],
    publishes: ['assets.asset.assigned', 'assets.asset.returned'],
    consumes: ['hr.employee.joined', 'hr.employee.exited'],
    scaling: smallScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'projects',
    domain: 'Delivery',
    description: 'Projects, phases, tasks, RACI, milestones, time entries.',
    port: 3023,
    database: 'projects',
    owns: [/^projects$/, /^project_/],
    customRoutes: [],
    publishes: ['projects.project.created', 'projects.milestone.reached'],
    consumes: ['sales.deal.won'],
    scaling: mediumScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'support',
    domain: 'Service Desk',
    description: 'Tickets, SLAs, escalation matrices, remote sessions, canned responses.',
    port: 3024,
    database: 'support',
    owns: [
      /^tickets$/, /^customer_support_/, /^support_/, /^remote_session/, /^canned_responses$/,
      /^organization_support_/, /^escalation_matrix_templates$/, /^cynet_licenses$/,
    ],
    customRoutes: ['tickets'],
    publishes: ['support.ticket.opened', 'support.ticket.breached_sla', 'support.ticket.resolved'],
    consumes: ['billing.invoice.issued'],
    scaling: largeScale,
    slo: { availability: 99.95, latencyP99Ms: 300, errorRatio: 0.0005 },
    drainSeconds: 30,
  },
  {
    name: 'compliance',
    domain: 'Governance',
    description: 'Frameworks, controls, evidence, legal documents, software licence posture.',
    port: 3025,
    database: 'compliance',
    owns: [
      /^compliance_/, /^legal_/, /^software_dependencies$/, /^cybersecurity_news$/, /^tenant_audit_log$/,
      /^document_templates$/,
    ],
    customRoutes: [],
    publishes: ['compliance.control.failed', 'compliance.evidence.attached'],
    consumes: ['identity.user.role_changed'],
    scaling: smallScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'marketing',
    domain: 'Demand',
    description: 'Campaigns, sequences, journeys, landing pages, PR and content.',
    port: 3026,
    database: 'marketing',
    owns: [
      /^marketing_/, /^email_(sequence|template)/, /^landing_pages$/, /^journey_/, /^pr_/,
      /^communications_/,
    ],
    customRoutes: [],
    publishes: ['marketing.campaign.launched', 'marketing.lead.captured'],
    consumes: ['crm.lead.converted'],
    scaling: mediumScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'collaboration',
    domain: 'Workspace',
    description: 'Chat, notifications, calendar, reminders, learning hub, employee events.',
    port: 3027,
    database: 'collaboration',
    owns: [
      /^chat_/, /^team_/, /^notifications$/, /^notification_preferences$/, /^calendar_events$/,
      /^event_wishes$/, /^learning_/, /^daily_activities$/, /^activity_definitions$/,
    ],
    customRoutes: [],
    publishes: ['collaboration.notification.created'],
    consumes: [
      'sales.deal.won', 'support.ticket.breached_sla', 'hr.leave.approved', 'billing.payment.received',
    ],
    scaling: largeScale,
    slo: defaultSlo,
    drainSeconds: 45,
  },
  {
    name: 'files',
    domain: 'Content',
    description: 'Object storage brokerage: signed uploads, downloads, virus-scan hand-off.',
    port: 3028,
    database: 'files',
    owns: [/^file_objects$/],
    customRoutes: ['storage'],
    publishes: ['files.object.uploaded'],
    consumes: [],
    scaling: mediumScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'integrations',
    domain: 'Connectivity',
    description: 'Third-party connectors, OAuth handshakes, outbound webhooks.',
    port: 3029,
    database: 'integrations',
    owns: [/^integrations$/, /^integration_/, /^webhook_/],
    customRoutes: ['integrations'],
    publishes: ['integrations.connection.established'],
    consumes: [],
    scaling: smallScale,
    slo: defaultSlo,
    drainSeconds: 30,
  },
  {
    name: 'ai',
    domain: 'Intelligence',
    description: 'Model routing, prompt orchestration, embeddings and insight generation.',
    port: 3030,
    database: 'ai',
    owns: [/^tenant_ai_configs$/, /^ai_/],
    customRoutes: ['ai'],
    publishes: ['ai.insight.generated'],
    consumes: ['sales.deal.stage_changed'],
    scaling: mediumScale,
    slo: { availability: 99.5, latencyP99Ms: 15000, errorRatio: 0.01 },
    drainSeconds: 60,
  },
  {
    name: 'workflow',
    domain: 'Orchestration',
    description: 'Long-running sagas, scheduled jobs, retries and the transactional outbox pump.',
    port: 3031,
    database: 'workflow',
    owns: [/^workflow_/, /^sales_funnel_workflows$/, /^sales_automations$/, /^outbox_events$/, /^saga_/],
    customRoutes: ['workflows'],
    publishes: ['workflow.saga.completed', 'workflow.saga.compensated'],
    consumes: ['*'],
    scaling: mediumScale,
    slo: { availability: 99.9, latencyP99Ms: 1000, errorRatio: 0.005 },
    drainSeconds: 120,
  },
];

export const SERVICE_BY_NAME = new Map<ServiceName, ServiceDefinition>(
  SERVICES.map((s) => [s.name, s]),
);

/** Every service that serves HTTP traffic behind the gateway. */
export const ROUTABLE_SERVICES = SERVICES.filter((s) => s.name !== 'gateway');

export function getService(name: string): ServiceDefinition {
  const svc = SERVICE_BY_NAME.get(name as ServiceName);
  if (!svc) {
    throw new Error(
      `Unknown service "${name}". Valid services: ${SERVICES.map((s) => s.name).join(', ')}`,
    );
  }
  return svc;
}

/** Resolve which service owns a table. Returns null when nothing claims it. */
export function serviceForTable(table: string): ServiceDefinition | null {
  for (const svc of ROUTABLE_SERVICES) {
    if (svc.owns.some((re) => re.test(table))) return svc;
  }
  return null;
}

/**
 * Guard against silent boundary erosion: fails loudly when a table has no
 * owner or is claimed by two services.
 */
export function assertFullTableOwnership(tables: string[]): void {
  const unowned: string[] = [];
  const contested: string[] = [];

  for (const table of tables) {
    const owners = ROUTABLE_SERVICES.filter((s) => s.owns.some((re) => re.test(table)));
    if (owners.length === 0) unowned.push(table);
    if (owners.length > 1) contested.push(`${table} -> ${owners.map((o) => o.name).join(', ')}`);
  }

  if (unowned.length || contested.length) {
    const parts: string[] = [];
    if (unowned.length) parts.push(`Tables with no owning service:\n  ${unowned.join('\n  ')}`);
    if (contested.length) parts.push(`Tables owned by more than one service:\n  ${contested.join('\n  ')}`);
    throw new Error(`Service boundary violation.\n${parts.join('\n')}`);
  }
}
