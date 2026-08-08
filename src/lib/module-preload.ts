/**
 * Chunk warming for main modules.
 *
 * The sidebar and the horizontal sub-module tab bar call `preloadModule(id)`
 * on hover / focus / pointer-down. Vite serves each module as its own ES
 * module, so importing it early puts it in the browser's module cache: by the
 * time the click lands the chunk is already parsed and the tab switch is
 * instant instead of showing a skeleton.
 */

import { retryImport } from "@/lib/chunk-retry";
import { markChunkWarm, measureChunkLoad } from "@/lib/perf-metrics";
import {
  cancelPreload,
  markPreloaded,
  schedulePreload,
  type PreloadTrigger,
} from "@/lib/preload-scheduler";

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

const loaded = new Set<string>();

/**
 * Warm the chunk backing a module id (e.g. "sales-leads" → the Sales chunk).
 *
 * Speculative by definition, so it goes through the preload scheduler: the
 * trigger decides how long the intent must persist (a pointer sweeping across
 * the sidebar never starts a download), and the scheduler caps how many warm-
 * ups run at once so they never crowd out the request the user is waiting on.
 * Skipped entirely while offline or on a metered / 2g connection.
 */
export function preloadModule(moduleId: string, trigger: PreloadTrigger = "hover") {
  const family = moduleId.split("-")[0];
  const loader = loaders[family];
  if (!loader || loaded.has(family)) return;

  schedulePreload(
    family,
    () =>
      // Measured as `source: "preload"` so the dashboard can report how often
      // speculative warming actually succeeds before the user clicks.
      measureChunkLoad(family, "preload", (onAttempt) =>
        retryImport(loader, {
          // Speculative work gets one cheap retry and a short leash, and must
          // never trigger a page reload on its own.
          retries: 1,
          timeout: 8_000,
          recoverStaleDeploy: false,
          onAttempt,
        }),
      ).then(() => {
        loaded.add(family);
        markChunkWarm(family);
      }),
    trigger,
  );
}

/**
 * Withdraw preload intent for a module — the pointer left, or focus moved on,
 * before the dwell delay elapsed.
 */
export function cancelPreloadModule(moduleId: string) {
  cancelPreload(moduleId.split("-")[0]);
}

/**
 * Load the chunk for a module id and surface failures to the caller.
 * Used when the user has actually committed to opening the module.
 */
export function loadModule(moduleId: string): Promise<unknown> {
  const family = moduleId.split("-")[0];
  const loader = loaders[family];
  if (!loader) return Promise.resolve();
  return measureChunkLoad(family, "navigation", (onAttempt) =>
    retryImport(loader, { label: "this section", onAttempt }),
  ).then((mod) => {
    loaded.add(family);
    markChunkWarm(family);
    // Stop the scheduler from ever queueing speculative work for this chunk.
    markPreloaded(family);
    return mod;
  });
}

/** The chunk family for a module id — used to avoid needless remounts. */
export function moduleFamily(moduleId: string) {
  return moduleId.split("-")[0];
}
