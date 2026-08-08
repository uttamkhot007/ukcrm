/**
 * Chunk warming for main modules.
 *
 * The sidebar and the horizontal sub-module tab bar call `preloadModule(id)`
 * on hover / focus / pointer-down. Vite serves each module as its own ES
 * module, so importing it early puts it in the browser's module cache: by the
 * time the click lands the chunk is already parsed and the tab switch is
 * instant instead of showing a skeleton.
 */

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  dashboard: () => import("@/components/dashboard/Dashboard"),
  sales: () => import("@/components/sales/SalesModule"),
  presales: () => import("@/components/presales/SolutionEngineeringModule"),
  technical: () => import("@/components/technical/TechnicalModule"),
  accounts: () => import("@/components/accounts/AccountsModule"),
  procurement: () => import("@/components/accounts/ProcurementInventoryModule"),
  finance: () => import("@/components/tally/TallyModule"),
  tally: () => import("@/components/tally/TallyModule"),
  billing: () => import("@/components/billing/BillingModule"),
  hr: () => import("@/components/hr/HRModule"),
  "people-intel": () => import("@/components/people/PeopleIntelligenceModule"),
  projects: () => import("@/components/projects/ProjectsModule"),
  marketing: () => import("@/components/marketing/MarketingModule"),
  communications: () => import("@/components/communications/CommunicationsModule"),
  pr: () => import("@/components/pr/PublicRelationsModule"),
  helpdesk: () => import("@/components/ticketing/TicketingModule"),
  ticketing: () => import("@/components/ticketing/TicketingModule"),
  compliance: () => import("@/components/compliance/ComplianceModule"),
  legal: () => import("@/components/legal/LegalModule"),
  renewals: () => import("@/components/renewals/RenewalsWrapper"),
  alliance: () => import("@/components/admin/AllianceModule"),
  offerings: () => import("@/components/admin/OfferingsModule"),
  templates: () => import("@/components/admin/DocumentTemplatesModule"),
  expenses: () => import("@/components/expenses/ExpenseModule"),
  assets: () => import("@/components/assets/AssetsModule"),
  it: () => import("@/components/it/ITModule"),
  management: () => import("@/components/analytics/ManagementAnalyticsModule"),
  employee: () => import("@/components/employee/EmployeeProfileModule"),
  attendance: () => import("@/components/employee/AttendanceModule"),
  requests: () => import("@/components/employee/RequestsModule"),
  learning: () => import("@/components/employee/LearningHubModule"),
  documentation: () => import("@/components/employee/DocumentationModule"),
  organization: () => import("@/components/employee/MyOrganization"),
  tenders: () => import("@/components/tenders/DealDeskModule"),
  remote: () => import("@/components/remote-sessions/RemoteSessionsModule"),
  customer: () => import("@/components/customer/CustomerPortal"),
};

const started = new Set<string>();

/** Warm the chunk backing a module id (e.g. "sales-leads" → the Sales chunk). */
export function preloadModule(moduleId: string) {
  const family = moduleId.split("-")[0];
  const loader = loaders[family];
  if (!loader || started.has(family)) return;
  started.add(family);
  void loader().catch(() => {
    // Allow a retry if the network dropped mid-chunk.
    started.delete(family);
  });
}

/** The chunk family for a module id — used to avoid needless remounts. */
export function moduleFamily(moduleId: string) {
  return moduleId.split("-")[0];
}
