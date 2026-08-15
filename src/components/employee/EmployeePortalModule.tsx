import { useEffect, useMemo } from "react";
import { lazyNamed, preloadWhenIdle, type PreloadableComponent } from "@/lib/lazy-module";
import { ModuleErrorBoundary } from "@/components/shared/ModuleErrorBoundary";
import { ModuleSwitchProbe } from "@/components/shared/ModuleSwitchProbe";
import { beginModuleSwitch } from "@/lib/perf-metrics";
import { PanelSkeleton, ModuleShell } from "@/components/shared/ModuleSkeleton";
import { ProgressiveSuspense } from "@/components/shared/ProgressiveSuspense";
import { KeepAlive } from "@/components/shared/KeepAlive";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { ModuleRefreshButton } from "@/components/shared/ModuleRefreshButton";
import { cn } from "@/lib/utils";
import {
  UserCircle,
  Network,
  DollarSign,
  Target,
  Clock,
  BarChart3,
  Activity,
  FolderKanban,
  Briefcase,
  Calendar,
  Receipt,
  Package,
  Ticket,
  FileCheck,
  BookOpen,
  GraduationCap,
  Video,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Every workspace is its own chunk, loaded when its tab is opened and warmed on
// hover so switching between employee screens feels immediate.
const EmployeeProfileModule = lazyNamed(() => import("./EmployeeProfileModule"), "EmployeeProfileModule");
const MyOrganization = lazyNamed(() => import("./MyOrganization"), "MyOrganization");
const EmployeeBenefitsModule = lazyNamed(() => import("./EmployeeBenefitsModule"), "EmployeeBenefitsModule");
const SkillMatrixModule = lazyNamed(() => import("./SkillMatrixModule"), "SkillMatrixModule");
const AttendanceModule = lazyNamed(() => import("./AttendanceModule"), "AttendanceModule");
const AttendanceReports = lazyNamed(() => import("./AttendanceReports"), "AttendanceReports");
const DailyActivityTracker = lazyNamed(() => import("./DailyActivityTracker"), "DailyActivityTracker");
const EmployeeWorkflowsModule = lazyNamed(() => import("./EmployeeWorkflowsModule"), "EmployeeWorkflowsModule");
const RequestsModule = lazyNamed(() => import("./RequestsModule"), "RequestsModule");
const RequestApprovalModule = lazyNamed(() => import("./RequestApprovalModule"), "RequestApprovalModule");
const EmployeeResourcesModule = lazyNamed(() => import("./EmployeeResourcesModule"), "EmployeeResourcesModule");
const LearningHubModule = lazyNamed(() => import("./LearningHubModule"), "LearningHubModule");
const TeamCommunication = lazyNamed(() => import("./TeamCommunication"), "TeamCommunication");
const EmployeeEventsModule = lazyNamed(() => import("./EmployeeEventsModule"), "EmployeeEventsModule");
const DocumentationModule = lazyNamed(() => import("./DocumentationModule"), "DocumentationModule");
const EmployeeAIAssistant = lazyNamed(() => import("./EmployeeAIAssistant"), "EmployeeAIAssistant");
const ExpenseModule = lazyNamed(() => import("@/components/expenses/ExpenseModule"), "ExpenseModule");
const AssetsModule = lazyNamed(() => import("@/components/assets/AssetsModule"), "AssetsModule");
const ProjectsModule = lazyNamed(() => import("@/components/projects/ProjectsModule"), "ProjectsModule");
const EmployeeTicketSection = lazyNamed(() => import("@/components/ticketing/EmployeeTicketSection"), "EmployeeTicketSection");

interface EmployeePortalModuleProps {
  /** Legacy sidebar / deep-link module id, e.g. "employee-profile". */
  initialTab?: string;
}

interface PortalTab {
  id: string;
  label: string;
  icon: LucideIcon;
  render: () => JSX.Element;
  preload?: PreloadableComponent<never>;
  /** When false the tab is hidden for the signed-in user. */
  visible?: boolean;
}

interface PortalGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  tabs: PortalTab[];
}

const asPreload = (c: unknown) => c as PreloadableComponent<never>;

/**
 * Employee Portal shell.
 *
 * Replaces the flat 16-item tab strip with the same two-level layout the Sales
 * module uses: a row of sections, and under it only the sub-tabs of the active
 * section.
 */
export function EmployeePortalModule({ initialTab = "employee-profile" }: EmployeePortalModuleProps) {
  const { currentTenant } = useTenant();
  const { isAdmin, isManager, isManagement } = useAuth();
  const canSeeTeamReports = Boolean(isAdmin || isManager || isManagement);

  const [activeTab, setActiveTab] = usePersistentState<string>(
    "employee-portal:active-tab",
    initialTab,
    {
      scope: currentTenant?.id ?? null,
      validate: (v): v is string => typeof v === "string" && v.length > 0,
    },
  );

  const groups: PortalGroup[] = useMemo(
    () => [
      {
        id: "me",
        label: "Me",
        icon: UserCircle,
        tabs: [
          { id: "profile", label: "My Profile", icon: UserCircle, render: () => <EmployeeProfileModule />, preload: asPreload(EmployeeProfileModule) },
          { id: "organization", label: "My Organization", icon: Network, render: () => <MyOrganization />, preload: asPreload(MyOrganization) },
          { id: "compensation", label: "My Compensation", icon: DollarSign, render: () => <EmployeeBenefitsModule />, preload: asPreload(EmployeeBenefitsModule) },
          { id: "skill-matrix", label: "Skill Matrix", icon: Target, render: () => <SkillMatrixModule viewMode="employee" />, preload: asPreload(SkillMatrixModule) },
        ],
      },
      {
        id: "work",
        label: "Work",
        icon: Clock,
        tabs: [
          { id: "attendance", label: "Attendance", icon: Clock, render: () => <AttendanceModule />, preload: asPreload(AttendanceModule) },
          { id: "attendance-reports", label: "Attendance Reports", icon: BarChart3, render: () => <AttendanceReports />, preload: asPreload(AttendanceReports), visible: canSeeTeamReports },
          { id: "activity-tracker", label: "Activity Tracker", icon: Activity, render: () => <DailyActivityTracker />, preload: asPreload(DailyActivityTracker) },
          { id: "workflows", label: "My Workflows", icon: FolderKanban, render: () => <EmployeeWorkflowsModule />, preload: asPreload(EmployeeWorkflowsModule) },
          { id: "projects", label: "Projects", icon: Briefcase, render: () => <ProjectsModule />, preload: asPreload(ProjectsModule) },
        ],
      },
      {
        id: "requests",
        label: "Requests",
        icon: Calendar,
        tabs: [
          { id: "leave", label: "Leave & Travel", icon: Calendar, render: () => <RequestsModule />, preload: asPreload(RequestsModule) },
          { id: "expenses", label: "Expenses", icon: Receipt, render: () => <ExpenseModule />, preload: asPreload(ExpenseModule) },
          { id: "assets", label: "Assets", icon: Package, render: () => <AssetsModule />, preload: asPreload(AssetsModule) },
          { id: "tickets", label: "Support Tickets", icon: Ticket, render: () => <EmployeeTicketSection />, preload: asPreload(EmployeeTicketSection) },
          { id: "approvals", label: "Request Approvals", icon: FileCheck, render: () => <RequestApprovalModule />, preload: asPreload(RequestApprovalModule) },
        ],
      },
      {
        id: "grow",
        label: "Grow",
        icon: GraduationCap,
        tabs: [
          { id: "resources", label: "Resources & Docs", icon: BookOpen, render: () => <EmployeeResourcesModule />, preload: asPreload(EmployeeResourcesModule) },
          { id: "learning-hub", label: "Learning Hub", icon: GraduationCap, render: () => <LearningHubModule />, preload: asPreload(LearningHubModule) },
          { id: "communication", label: "Team Communication", icon: Video, render: () => <TeamCommunication />, preload: asPreload(TeamCommunication) },
          { id: "events", label: "Events & Recognition", icon: PartyPopper, render: () => <EmployeeEventsModule />, preload: asPreload(EmployeeEventsModule) },
          { id: "documentation", label: "SOPs", icon: BookOpen, render: () => <DocumentationModule />, preload: asPreload(DocumentationModule) },
          { id: "ai-assistant", label: "My AI Assistant", icon: Sparkles, render: () => <EmployeeAIAssistant />, preload: asPreload(EmployeeAIAssistant) },
        ],
      },
    ],
    [canSeeTeamReports],
  );

  // Hide tabs the signed-in user cannot use, then drop empty sections.
  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, tabs: g.tabs.filter((t) => t.visible !== false) }))
        .filter((g) => g.tabs.length > 0),
    [groups],
  );

  // Legacy sidebar / deep-link ids kept working.
  const aliases: Record<string, string> = useMemo(
    () => ({
      employee: "profile",
      "employee-profile": "profile",
      "employee-organization": "organization",
      "employee-benefits": "compensation",
      "employee-skill-matrix": "skill-matrix",
      "employee-attendance": "attendance",
      "employee-attendance-reports": "attendance-reports",
      "employee-activity-tracker": "activity-tracker",
      "employee-workflows": "workflows",
      "employee-tasks": "workflows",
      "employee-projects": "projects",
      "employee-leave": "leave",
      "employee-requests": "expenses",
      "employee-travel": "expenses",
      "employee-expenses": "expenses",
      "employee-assets": "assets",
      "employee-tickets": "tickets",
      "employee-approvals": "approvals",
      "employee-resources": "resources",
      "learning-hub": "learning-hub",
      "employee-communication": "communication",
      "employee-events": "events",
      "employee-documentation": "documentation",
      "employee-ai-assistant": "ai-assistant",
    }),
    [],
  );

  useEffect(() => {
    setActiveTab(aliases[initialTab] ?? initialTab);
  }, [initialTab, aliases]);

  const resolvedTab = aliases[activeTab] ?? activeTab;
  const activeGroup =
    visibleGroups.find((g) => g.tabs.some((t) => t.id === resolvedTab)) ?? visibleGroups[0];
  const currentTab =
    activeGroup.tabs.find((t) => t.id === resolvedTab) ?? activeGroup.tabs[0];

  const selectTab = (id: string) => {
    const target = visibleGroups.flatMap((g) => g.tabs).find((t) => t.id === id);
    beginModuleSwitch(`employee:${id}`, target?.preload?.chunkName ?? "employee");
    setActiveTab(id);
  };

  // Warm every chunk in the current section once the browser is idle so
  // keyboard and touch users get the same instant switches as hover users.
  useEffect(
    () =>
      preloadWhenIdle(
        activeGroup.tabs
          .map((t) => t.preload)
          .filter((p): p is PreloadableComponent<never> => Boolean(p)),
      ),
    [activeGroup],
  );

  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>, selector: string) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(selector));
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
          <h1 className="text-3xl font-bold">Employee Portal</h1>
          <p className="text-muted-foreground mt-1">
            {visibleGroups.map((g) => g.label).join(" · ")}
          </p>
        </div>
      </div>

      {/* Section level */}
      <div className="border-b border-border">
        <div
          role="tablist"
          aria-label="Employee Portal sections"
          onKeyDown={(e) => moveFocus(e, '[data-group-tab="true"]')}
          className="flex items-center gap-1 overflow-x-auto"
        >
          {visibleGroups.map((group) => {
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
                    : "border-transparent text-muted-foreground hover:text-foreground",
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
                aria-controls="employee-tab-panel"
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
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* Kept-alive panes serve cached data; this forces a live re-fetch. */}
        <ModuleRefreshButton className="shrink-0" />
      </div>

      <div
        className="min-w-0"
        id="employee-tab-panel"
        role="tabpanel"
        tabIndex={-1}
        aria-live="polite"
        aria-label={`${currentTab.label} workspace`}
      >
        {/* Visited tabs stay mounted (LRU) so returning keeps filters, scroll
            position and already-fetched data. */}
        <KeepAlive activeKey={currentTab.id} max={4} moduleId="employee">
          {(key) => {
            const tab = visibleGroups.flatMap((g) => g.tabs).find((t) => t.id === key);
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
                    <ModuleSwitchProbe moduleId={`employee:${tab.id}`} />
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
