import { Suspense, useEffect, useMemo, useState } from "react";
import { lazyNamed, preloadWhenIdle, type PreloadableComponent } from "@/lib/lazy-module";
import { ModuleErrorBoundary } from "@/components/shared/ModuleErrorBoundary";
import { ModuleSwitchProbe } from "@/components/shared/ModuleSwitchProbe";
import { beginModuleSwitch } from "@/lib/perf-metrics";
import { PanelSkeleton, ModuleShell } from "@/components/shared/ModuleSkeleton";
import { ProgressiveSuspense } from "@/components/shared/ProgressiveSuspense";
import { KeepAlive } from "@/components/shared/KeepAlive";
import { ActivityTimeline } from "./ActivityTimeline";
import { LogActivitySection } from "./LogActivitySection";
import { SalesQuickActions } from "./SalesQuickActions";
import { SalesModuleDashboard } from "./SalesModuleDashboard";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Package,
  Mail,
  Sparkles,
  LayoutDashboard,
  Handshake,
  Activity,
  Phone,
  Building2,
  Timer,
  Target,
  BarChart3,
  FileText,
  BookOpen,
  Gauge,
  Users,
  Zap,
  Map,
  FileCheck,
  Brain,
  type LucideIcon,
} from "lucide-react";


// Each workspace below is its own chunk. MEDDIC, the deal wizard and the
// contacts grid are the heaviest screens in the app; loading them only when
// their tab is opened (and preloading on hover) is what makes the tab switch
// feel immediate instead of stalling on a large download.
const DealsView = lazyNamed(() => import("./DealsView"), "DealsView");
const LeadsView = lazyNamed(() => import("./LeadsView"), "LeadsView");
const ContactsView = lazyNamed(() => import("./ContactsView"), "ContactsView");
const QuotationsView = lazyNamed(() => import("./QuotationsView"), "QuotationsView");
const SalesReports = lazyNamed(() => import("./SalesReports"), "SalesReports");
const MyAccountsView = lazyNamed(() => import("./MyAccountsView"), "MyAccountsView");
const DealRegistrationModule = lazyNamed(() => import("./DealRegistrationModule"), "DealRegistrationModule");
const LeadScoring = lazyNamed(() => import("./LeadScoring"), "LeadScoring");
const DealInsights = lazyNamed(() => import("./DealInsights"), "DealInsights");
const SalesForecasting = lazyNamed(() => import("./SalesForecasting"), "SalesForecasting");
const EmailSequences = lazyNamed(() => import("./EmailSequences"), "EmailSequences");
const SalesAutomations = lazyNamed(() => import("./SalesAutomations"), "SalesAutomations");
const MEDDICWorkflow = lazyNamed(() => import("./MEDDICWorkflow"), "MEDDICWorkflow");
const ProductCatalog = lazyNamed(() => import("./ProductCatalog"), "ProductCatalog");
const TerritoryManagement = lazyNamed(() => import("./TerritoryManagement"), "TerritoryManagement");
const RottenDeals = lazyNamed(() => import("./RottenDeals"), "RottenDeals");
const InsideSalesModule = lazyNamed(() => import("./InsideSalesModule"), "InsideSalesModule");
const SalesAIAssistant = lazyNamed(() => import("./SalesAIAssistant"), "SalesAIAssistant");
const OfferingsModule = lazyNamed(() => import("@/components/admin/OfferingsModule"), "OfferingsModule");
const DocumentationModule = lazyNamed(() => import("@/components/employee/DocumentationModule"), "DocumentationModule");

interface SalesModuleProps {
  initialTab?: string;
}

interface SalesTab {
  id: string;
  label: string;
  icon: LucideIcon;
  render: () => JSX.Element;
  /** Chunk to warm when the user hovers or focuses this tab. */
  preload?: PreloadableComponent<never>;
}


interface SalesGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  tabs: SalesTab[];
}

function ActivityWorkspace() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Activity Timeline</h2>
      <p className="text-muted-foreground mb-6">
        Track all interactions and changes for deals
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityTimeline limit={50} />
        </div>
        <div>
          <LogActivitySection />
        </div>
      </div>
    </div>
  );
}

export function SalesModule({ initialTab = "dashboard" }: SalesModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const groups: SalesGroup[] = useMemo(
    () => [
      {
        id: "pipeline",
        label: "Pipeline",
        icon: TrendingUp,
        tabs: [
          { id: "dashboard", label: "Insights", icon: LayoutDashboard, render: () => <SalesModuleDashboard onNavigate={setActiveTab} /> },
          { id: "deals", label: "Deals", icon: Handshake, render: () => <DealsView />, preload: DealsView as unknown as PreloadableComponent<never> },
          { id: "leads", label: "Leads", icon: Activity, render: () => <LeadsView />, preload: LeadsView as unknown as PreloadableComponent<never> },
          { id: "contacts", label: "Contacts", icon: Phone, render: () => <ContactsView />, preload: ContactsView as unknown as PreloadableComponent<never> },
          { id: "my-accounts", label: "Accounts", icon: Building2, render: () => <MyAccountsView />, preload: MyAccountsView as unknown as PreloadableComponent<never> },
          { id: "activity", label: "Activity", icon: Timer, render: () => <ActivityWorkspace /> },
          { id: "rotten-deals", label: "Rotten Deals", icon: Target, render: () => <RottenDeals />, preload: RottenDeals as unknown as PreloadableComponent<never> },
        ],
      },
      {
        id: "tools",
        label: "Tools",
        icon: Package,
        tabs: [
          { id: "meddic-workflow", label: "MEDDIC", icon: Sparkles, render: () => <MEDDICWorkflow />, preload: MEDDICWorkflow as unknown as PreloadableComponent<never> },
          { id: "forecasting", label: "Forecasting", icon: BarChart3, render: () => <SalesForecasting />, preload: SalesForecasting as unknown as PreloadableComponent<never> },
          { id: "quotations", label: "Quotations", icon: FileText, render: () => <QuotationsView />, preload: QuotationsView as unknown as PreloadableComponent<never> },
          { id: "catalog", label: "Catalog", icon: BookOpen, render: () => <ProductCatalog />, preload: ProductCatalog as unknown as PreloadableComponent<never> },
          { id: "lead-scoring", label: "Lead Scoring", icon: Gauge, render: () => <LeadScoring />, preload: LeadScoring as unknown as PreloadableComponent<never> },
          { id: "offerings", label: "Offerings", icon: Package, render: () => <OfferingsModule readOnly />, preload: OfferingsModule as unknown as PreloadableComponent<never> },
        ],
      },
      {
        id: "outreach",
        label: "Outreach",
        icon: Mail,
        tabs: [
          { id: "inside-sales", label: "Inside Sales", icon: Users, render: () => <InsideSalesModule initialTab="prospects" />, preload: InsideSalesModule as unknown as PreloadableComponent<never> },
          { id: "email-sequences", label: "Sequences", icon: Mail, render: () => <EmailSequences />, preload: EmailSequences as unknown as PreloadableComponent<never> },
          { id: "automations", label: "Cadences", icon: Zap, render: () => <SalesAutomations />, preload: SalesAutomations as unknown as PreloadableComponent<never> },
          { id: "territory", label: "Territory", icon: Map, render: () => <TerritoryManagement />, preload: TerritoryManagement as unknown as PreloadableComponent<never> },
        ],
      },
      {
        id: "intelligence",
        label: "Intelligence",
        icon: Sparkles,
        tabs: [
          { id: "deal-registration", label: "Deal Reg", icon: FileCheck, render: () => <DealRegistrationModule />, preload: DealRegistrationModule as unknown as PreloadableComponent<never> },
          { id: "reports", label: "Reports", icon: BarChart3, render: () => <SalesReports />, preload: SalesReports as unknown as PreloadableComponent<never> },
          { id: "sales-ai", label: "Sales AI", icon: Brain, render: () => <SalesAIAssistant />, preload: SalesAIAssistant as unknown as PreloadableComponent<never> },
          { id: "deal-insights", label: "Deal Insights", icon: TrendingUp, render: () => <DealInsights />, preload: DealInsights as unknown as PreloadableComponent<never> },
          { id: "sops", label: "Sales SOPs", icon: BookOpen, render: () => <DocumentationModule />, preload: DocumentationModule as unknown as PreloadableComponent<never> },
        ],
      },
    ],
    []
  );

  // Legacy tab ids that used to be passed in from the sidebar / Index router.
  const aliases: Record<string, string> = useMemo(
    () => ({
      "team-contacts": "contacts",
      meddic: "meddic-workflow",
      "product-catalog": "catalog",
      // Legacy sidebar module ids
      "sales-meddic-workflow": "meddic-workflow",
      "sales-quotations": "quotations",
      "sales-leads": "leads",
      "sales-my-accounts": "my-accounts",
      "sales-contacts": "contacts",
      "sales-team-contacts": "contacts",
      "sales-offerings": "offerings",
      "sales-documentation": "sops",
      "sales-deal-registration": "deal-registration",
      "sales-ai-assistant": "sales-ai",
    }),
    []
  );

  useEffect(() => {
    setActiveTab(aliases[initialTab] ?? initialTab);
  }, [initialTab, aliases]);

  const resolvedTab = aliases[activeTab] ?? activeTab;

  const activeGroup =
    groups.find((g) => g.tabs.some((t) => t.id === resolvedTab)) ?? groups[0];
  const currentTab =
    activeGroup.tabs.find((t) => t.id === resolvedTab) ?? groups[0].tabs[0];

  const showQuickActions = currentTab.id === "deals";

  /**
   * Tab switch entry point. Starts the performance benchmark against the tab's
   * own chunk, so "warm" reflects whether preloading actually won the race
   * rather than whether the Sales shell happened to be loaded.
   */
  const selectTab = (id: string) => {
    const target = groups.flatMap((g) => g.tabs).find((t) => t.id === id);
    beginModuleSwitch(`sales:${id}`, target?.preload?.chunkName ?? "sales");
    setActiveTab(id);
  };

  // Warm every chunk in the group the user is currently in, once the browser
  // is idle. Hover preloading only helps with a mouse; this makes keyboard and
  // touch navigation between sibling tabs feel instant too.
  useEffect(
    () =>
      preloadWhenIdle(
        activeGroup.tabs
          .map((t) => t.preload)
          .filter((p): p is PreloadableComponent<never> => Boolean(p))
      ),
    [activeGroup]
  );

  const moveFocus = (
    event: React.KeyboardEvent<HTMLDivElement>,
    selector: string
  ) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(selector)
    );
    if (buttons.length === 0) return;
    const index = buttons.findIndex((b) => b === document.activeElement);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
    if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    if (next < 0) next = 0;
    event.preventDefault();
    buttons[next]?.focus();
  };

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales &amp; CRM</h1>
          <p className="text-muted-foreground mt-1">
            {groups.map((g) => g.label).join(" · ")}
          </p>
        </div>
        {showQuickActions && <SalesQuickActions />}
      </div>

      {/* Group level */}
      <div className="border-b border-border">
        <div
          role="tablist"
          aria-label="Sales sections"
          onKeyDown={(e) => moveFocus(e, '[data-group-tab="true"]')}
          className="flex items-center gap-1 overflow-x-auto"
        >
          {groups.map((group) => {
            const isActive = group.id === activeGroup.id;
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                data-group-tab="true"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectTab(group.tabs[0].id)}
                onMouseEnter={() => group.tabs[0].preload?.warm("hover")}
                onMouseLeave={() => group.tabs[0].preload?.cancelWarm()}
                onFocus={() => group.tabs[0].preload?.warm("focus")}
                onBlur={() => group.tabs[0].preload?.cancelWarm()}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  focusRing,
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <group.icon className="w-4 h-4" aria-hidden="true" />
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub level */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
      <div
        role="tablist"
        aria-label={`${activeGroup.label} views`}
        onKeyDown={(e) => moveFocus(e, '[data-sub-tab="true"]')}
        className="flex items-center gap-2 flex-wrap"
      >

        {activeGroup.tabs.map((tab) => {
          const isActive = tab.id === currentTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-sub-tab="true"
              aria-selected={isActive}
              aria-controls="sales-tab-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onMouseEnter={() => tab.preload?.warm("hover")}
              onMouseLeave={() => tab.preload?.cancelWarm()}
              onFocus={() => tab.preload?.warm("focus")}
              onBlur={() => tab.preload?.cancelWarm()}
              onPointerDown={() => tab.preload?.warm("pointer")}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                focusRing,
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="min-w-0"
        id="sales-tab-panel"
        role="tabpanel"
        tabIndex={-1}
        aria-live="polite"
        aria-label={`${currentTab.label} workspace`}
      >
        {/* Visited tabs stay mounted (LRU) so returning to Deals or MEDDIC keeps
            filters, scroll and already-fetched data instead of reloading. */}
        <KeepAlive activeKey={currentTab.id} max={4}>
          {(key) => {
            const tab = groups.flatMap((g) => g.tabs).find((t) => t.id === key);
            if (!tab) return null;
            return (
              <ModuleErrorBoundary
                resetKey={tab.id}
                onRetry={() => tab.preload?.preload() ?? Promise.resolve()}
              >
                <ProgressiveSuspense
                  boundaryKey={tab.id}
                  shell={<ModuleShell title={tab.label} />}
                  skeleton={<PanelSkeleton />}
                >
                  {tab.render()}
                  {tab.id === currentTab.id && (
                    <ModuleSwitchProbe moduleId={`sales:${tab.id}`} />
                  )}
                </ProgressiveSuspense>
              </ModuleErrorBoundary>
            );
          }}
        </KeepAlive>
      </div>

    </div>
  );
}
