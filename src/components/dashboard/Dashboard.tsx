import {
  TrendingUp,
  DollarSign,
  Users,
  Code,
  HeadphonesIcon,
  Megaphone,
  BarChart3,
  UserCircle,
  Target,
  Ticket,
  FolderKanban,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { MetricCard } from "./MetricCard";
import { ModuleCard } from "./ModuleCard";
import { ActivityFeed } from "./ActivityFeed";
import { SalesFunnel } from "./SalesFunnel";
import { RevenueChart } from "./RevenueChart";
import { TeamPerformance } from "./TeamPerformance";
import { QuickActions } from "./QuickActions";
import { UpcomingTasks } from "./UpcomingTasks";
import { SalesWidgets } from "./SalesWidgets";
import { UpcomingFollowUps } from "./UpcomingFollowUps";
import { PendingApprovalsWidget } from "./PendingApprovalsWidget";
import { EmployeeWidgets } from "./EmployeeWidgets";
import { TeamSpecificWidgets } from "./TeamSpecificWidgets";
import { NotificationCenterWidget } from "./NotificationCenterWidget";
import { UpcomingEventsWidget } from "./UpcomingEventsWidget";

interface DashboardProps {
  onModuleChange: (module: string) => void;
}

const getMetrics = (formatCurrency: (value: number) => string) => [
  {
    title: "Total Revenue",
    value: formatCurrency(2400000),
    change: 12.5,
    changeLabel: "vs last month",
    icon: DollarSign,
    color: "finance" as const,
    requiredRoles: ["admin", "manager"],
  },
  {
    title: "Active Deals",
    value: "847",
    change: 8.2,
    changeLabel: "vs last month",
    icon: Target,
    color: "sales" as const,
    requiredRoles: ["admin", "manager"],
  },
  {
    title: "Team Members",
    value: "156",
    change: 4.1,
    changeLabel: "vs last month",
    icon: Users,
    color: "hr" as const,
    requiredRoles: ["admin", "manager"],
  },
  {
    title: "Active Projects",
    value: "32",
    change: -2.3,
    changeLabel: "vs last month",
    icon: FolderKanban,
    color: "tech" as const,
    requiredRoles: ["admin", "manager"],
  },
  {
    title: "Open Tickets",
    value: "89",
    change: -15.4,
    changeLabel: "vs last month",
    icon: Ticket,
    color: "support" as const,
    requiredRoles: ["admin", "manager"],
  },
  {
    title: "MQL Generated",
    value: "1,245",
    change: 23.8,
    changeLabel: "vs last month",
    icon: Megaphone,
    color: "marketing" as const,
    requiredRoles: ["admin", "manager"],
  },
];

const getModules = (formatCurrency: (value: number) => string) => [
  {
    id: "sales",
    title: "Sales",
    description: "Funnel management, quotations & lead tracking",
    icon: TrendingUp,
    color: "sales" as const,
    stats: [
      { label: "Pipeline", value: formatCurrency(12500000) },
      { label: "Win Rate", value: "32%" },
    ],
    requiredRoles: ["admin", "manager"],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Payments, DSO, P&L and GST reports",
    icon: DollarSign,
    color: "finance" as const,
    stats: [
      { label: "Receivables", value: formatCurrency(890000) },
      { label: "DSO", value: "45 days" },
    ],
    requiredRoles: ["admin", "manager"],
  },
  {
    id: "hr",
    title: "Human Resources",
    description: "People management & onboarding",
    icon: Users,
    color: "hr" as const,
    stats: [
      { label: "Employees", value: "156" },
      { label: "Open Positions", value: "12" },
    ],
    requiredRoles: ["admin", "manager"],
  },
  {
    id: "tech",
    title: "Technical",
    description: "Projects, knowledge base & updates",
    icon: Code,
    color: "tech" as const,
    stats: [
      { label: "Projects", value: "32" },
      { label: "Sprints", value: "8" },
    ],
    requiredRoles: ["admin", "manager"],
  },
  {
    id: "support",
    title: "Customer Support",
    description: "Ticketing and customer service",
    icon: HeadphonesIcon,
    color: "support" as const,
    stats: [
      { label: "Open", value: "89" },
      { label: "Avg Response", value: "2.4h" },
    ],
    requiredRoles: ["admin", "manager"],
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Campaigns, SQL & MQL tracking",
    icon: Megaphone,
    color: "marketing" as const,
    stats: [
      { label: "Campaigns", value: "15" },
      { label: "Leads", value: "1,245" },
    ],
    requiredRoles: ["admin", "manager"],
  },
  {
    id: "management",
    title: "Management",
    description: "Performance & financial overview",
    icon: BarChart3,
    color: "management" as const,
    stats: [
      { label: "Net Profit", value: "dynamicNetProfit" },
      { label: "Growth", value: "+18%" },
    ],
    requiredRoles: ["admin"],
  },
  {
    id: "employee",
    title: "Employee Portal",
    description: "Training, leaves & personal info",
    icon: UserCircle,
    color: "employee" as const,
    stats: [
      { label: "Trainings", value: "24" },
      { label: "Pending", value: "3" },
    ],
  },
];

export function Dashboard({ onModuleChange }: DashboardProps) {
  const { profile, role, isAdmin, isManager, teams } = useAuth();
  const { formatCurrency, getCurrencySymbol } = useOrganizationSettings();

  const hasAccess = (requiredRoles?: string[]) => {
    if (!requiredRoles) return true;
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  const allMetrics = getMetrics(formatCurrency);
  const allModules = getModules(formatCurrency).map(m => {
    if (m.id === "management") {
      return {
        ...m,
        stats: m.stats.map(s => 
          s.value === "dynamicNetProfit" ? { ...s, value: formatCurrency(1200000) } : s
        ),
      };
    }
    return m;
  });

  const metrics = allMetrics.filter((m) => hasAccess(m.requiredRoles));
  const modules = allModules.filter((m) => hasAccess(m.requiredRoles));

  // Check if user has any team assignment for team-specific widgets
  const hasTeamAssignment = teams.length > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back,{" "}
            <span className="text-gradient">
              {profile?.full_name?.split(" ")[0] || "User"}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "You have full administrative access"
              : isManager
              ? "Here's what's happening with your business today"
              : "Access your personal dashboard and tools"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-lg font-semibold">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Metrics Grid - Only for Admin/Manager */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((metric, index) => (
            <MetricCard key={metric.title} {...metric} delay={index * 100} />
          ))}
        </div>
      )}

      {/* Main Content Grid - Only for Admin/Manager */}
      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RevenueChart />
            <SalesFunnel />
          </div>
          <div className="space-y-6">
            <NotificationCenterWidget />
            <UpcomingEventsWidget />
            <QuickActions />
            <PendingApprovalsWidget onNavigate={onModuleChange} />
            <UpcomingFollowUps onNavigate={onModuleChange} />
            <UpcomingTasks />
          </div>
        </div>
      )}

      {/* Employee-Specific Widgets - For non-admin/manager users */}
      {!isAdmin && !isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EmployeeWidgets onNavigate={onModuleChange} />
          </div>
          <div>
            <UpcomingEventsWidget />
          </div>
        </div>
      )}

      {/* Sales Dashboard Widgets - Only for Admin/Manager */}
      {(isAdmin || isManager) && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Sales Overview</h2>
          <SalesWidgets />
        </div>
      )}

      {/* Team-Specific Widgets - For users with team assignments who aren't admin/manager */}
      {!isAdmin && !isManager && hasTeamAssignment && (
        <TeamSpecificWidgets onNavigate={onModuleChange} />
      )}

      {/* Modules Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {isAdmin || isManager ? "Modules" : "Your Tools"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <ModuleCard
              key={module.id}
              {...module}
              onClick={() => onModuleChange(module.id)}
              delay={index * 50}
            />
          ))}
        </div>
      </div>

      {/* Bottom Section - Only for Admin/Manager */}
      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed />
          <TeamPerformance />
        </div>
      )}
    </div>
  );
}
