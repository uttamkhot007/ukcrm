import { useEffect, useMemo, useState } from "react";
import { DealsView } from "./DealsView";
import { LeadsView } from "./LeadsView";
import { ContactsView } from "./ContactsView";
import { QuotationsView } from "./QuotationsView";
import { ActivityTimeline } from "./ActivityTimeline";
import { SalesReports } from "./SalesReports";
import { LogActivitySection } from "./LogActivitySection";
import { SalesQuickActions } from "./SalesQuickActions";
import { MyAccountsView } from "./MyAccountsView";
import { DealRegistrationModule } from "./DealRegistrationModule";
import { LeadScoring } from "./LeadScoring";
import { DealInsights } from "./DealInsights";
import { SalesForecasting } from "./SalesForecasting";
import { EmailSequences } from "./EmailSequences";
import { SalesAutomations } from "./SalesAutomations";
import { MEDDICWorkflow } from "./MEDDICWorkflow";
import { SalesModuleDashboard } from "./SalesModuleDashboard";
import { ProductCatalog } from "./ProductCatalog";
import { TerritoryManagement } from "./TerritoryManagement";
import { RottenDeals } from "./RottenDeals";
import { InsideSalesModule } from "./InsideSalesModule";
import { SalesAIAssistant } from "./SalesAIAssistant";
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

interface SalesModuleProps {
  initialTab?: string;
}

interface SalesTab {
  id: string;
  label: string;
  icon: LucideIcon;
  render: () => JSX.Element;
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
          { id: "deals", label: "Deals", icon: Handshake, render: () => <DealsView /> },
          { id: "leads", label: "Leads", icon: Activity, render: () => <LeadsView /> },
          { id: "contacts", label: "Contacts", icon: Phone, render: () => <ContactsView /> },
          { id: "my-accounts", label: "Accounts", icon: Building2, render: () => <MyAccountsView /> },
          { id: "activity", label: "Activity", icon: Timer, render: () => <ActivityWorkspace /> },
          { id: "rotten-deals", label: "Rotten Deals", icon: Target, render: () => <RottenDeals /> },
        ],
      },
      {
        id: "tools",
        label: "Tools",
        icon: Package,
        tabs: [
          { id: "meddic-workflow", label: "MEDDIC", icon: Sparkles, render: () => <MEDDICWorkflow /> },
          { id: "forecasting", label: "Forecasting", icon: BarChart3, render: () => <SalesForecasting /> },
          { id: "quotations", label: "Quotations", icon: FileText, render: () => <QuotationsView /> },
          { id: "catalog", label: "Catalog", icon: BookOpen, render: () => <ProductCatalog /> },
          { id: "lead-scoring", label: "Lead Scoring", icon: Gauge, render: () => <LeadScoring /> },
        ],
      },
      {
        id: "outreach",
        label: "Outreach",
        icon: Mail,
        tabs: [
          { id: "inside-sales", label: "Inside Sales", icon: Users, render: () => <InsideSalesModule initialTab="prospects" /> },
          { id: "email-sequences", label: "Sequences", icon: Mail, render: () => <EmailSequences /> },
          { id: "automations", label: "Cadences", icon: Zap, render: () => <SalesAutomations /> },
          { id: "territory", label: "Territory", icon: Map, render: () => <TerritoryManagement /> },
        ],
      },
      {
        id: "intelligence",
        label: "Intelligence",
        icon: Sparkles,
        tabs: [
          { id: "deal-registration", label: "Deal Reg", icon: FileCheck, render: () => <DealRegistrationModule /> },
          { id: "reports", label: "Reports", icon: BarChart3, render: () => <SalesReports /> },
          { id: "sales-ai", label: "Sales AI", icon: Brain, render: () => <SalesAIAssistant /> },
          { id: "deal-insights", label: "Deal Insights", icon: TrendingUp, render: () => <DealInsights /> },
        ],
      },
    ],
    []
  );

  // Legacy tab ids that used to be passed in from the sidebar / Index router.
  const aliases: Record<string, string> = useMemo(
    () => ({ "team-contacts": "contacts", "meddic": "meddic-workflow", "product-catalog": "catalog" }),
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
        <div className="flex items-center gap-1 overflow-x-auto">
          {groups.map((group) => {
            const isActive = group.id === activeGroup.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveTab(group.tabs[0].id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <group.icon className="w-4 h-4" />
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub level */}
      <div className="flex items-center gap-2 flex-wrap">
        {activeGroup.tabs.map((tab) => {
          const isActive = tab.id === currentTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0">{currentTab.render()}</div>
    </div>
  );
}
