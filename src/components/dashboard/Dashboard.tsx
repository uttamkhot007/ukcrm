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
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/api/client";
import { PremiumMetricCard } from "./PremiumMetricCard";
import { PremiumModuleCard } from "./PremiumModuleCard";
import { ActivityFeed } from "./ActivityFeed";
import { MEDDICPipeline } from "./MEDDICPipeline";
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
import { CurrencyConverterWidget } from "./CurrencyConverterWidget";
import { SalesRepDashboard } from "./SalesRepDashboard";
import { SalesManagerDashboard } from "./SalesManagerDashboard";
import { PresalesDashboard } from "./PresalesDashboard";
import { InsideSalesDashboard } from "./InsideSalesDashboard";
import { AccountsDashboard } from "./AccountsDashboard";
import { RenewalDashboard } from "./RenewalDashboard";
import { MotivationalQuoteWidget } from "./MotivationalQuoteWidget";
import { SecurityCenterWidget } from "./SecurityCenterWidget";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { DraggableWidgetContainer } from "./DraggableWidgetContainer";

interface DashboardProps {
  onModuleChange: (module: string) => void;
}

interface DashboardHeaderProps {
  profile: { full_name?: string } | null;
  isAdmin: boolean;
  isManager: boolean;
}

function DashboardHeader({ profile, isAdmin, isManager }: DashboardHeaderProps) {
  return (
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
  );
}

export function Dashboard({ onModuleChange }: DashboardProps) {
  const { profile, role, isAdmin, isManager, isPlatformAdmin, teams } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const { dashboardType } = useTeamRole();
  const { widgets, reorderWidgets, getWidgetsByIds } = useDashboardWidgets();

  // Defense in depth: no routing race, restored component tree, or legacy
  // navigation state may expose the retired tenant dashboard to platform admins.
  if (isPlatformAdmin) {
    return <Navigate to="/admin/platform/tenants" replace />;
  }
  
  // Get current tenant ID
  const currentTenantId = currentTenant?.id;

  // Render role-specific dashboards
  if (dashboardType === "sales_rep") {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />
        <MotivationalQuoteWidget />
        <SalesRepDashboard onNavigate={onModuleChange} />
      </div>
    );
  }

  if (dashboardType === "sales_manager") {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />
        <MotivationalQuoteWidget />
        <SalesManagerDashboard onNavigate={onModuleChange} />
      </div>
    );
  }

  if (dashboardType === "presales_rep") {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />
        <MotivationalQuoteWidget />
        <PresalesDashboard onNavigate={onModuleChange} isManager={false} />
      </div>
    );
  }

  if (dashboardType === "presales_manager") {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />
        <MotivationalQuoteWidget />
        <PresalesDashboard onNavigate={onModuleChange} isManager={true} />
      </div>
    );
  }

  if (dashboardType === "inside_sales") {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />
        <MotivationalQuoteWidget />
        <InsideSalesDashboard onNavigate={onModuleChange} />
      </div>
    );
  }

  if (dashboardType === "accounts") {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />
        <MotivationalQuoteWidget />
        <AccountsDashboard onNavigate={onModuleChange} />
      </div>
    );
  }

  if (dashboardType === "renewal") {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />
        <MotivationalQuoteWidget />
        <RenewalDashboard onNavigate={onModuleChange} />
      </div>
    );
  }

  // Fetch real metrics from database (filtered by tenant)
  const { data: realMetrics } = useQuery({
    queryKey: ["dashboard-metrics", currentTenantId],
    queryFn: async () => {
      // Build queries with tenant filter
      const dealsQuery = currentTenantId 
        ? supabase.from("deals").select("id, value, stage").eq("tenant_id", currentTenantId)
        : supabase.from("deals").select("id, value, stage");
      
      const employeesQuery = currentTenantId 
        ? supabase.from("profiles").select("id").eq("tenant_id", currentTenantId)
        : supabase.from("profiles").select("id");
      
      const ticketsQuery = currentTenantId 
        ? supabase.from("tickets").select("id, status").eq("tenant_id", currentTenantId)
        : supabase.from("tickets").select("id, status");
      
      const invoicesQuery = currentTenantId 
        ? supabase.from("invoices").select("id, total, status").eq("tenant_id", currentTenantId)
        : supabase.from("invoices").select("id, total, status");

      const [dealsRes, employeesRes, ticketsRes, invoicesRes] = await Promise.all([
        dealsQuery,
        employeesQuery,
        ticketsQuery,
        invoicesQuery,
      ]);

      const deals = dealsRes.data || [];
      const employees = employeesRes.data || [];
      const tickets = ticketsRes.data || [];
      const invoices = invoicesRes.data || [];

      // Calculate totals
      const activeDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage));
      const totalDealValue = activeDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const openTickets = tickets.filter(t => !["resolved", "closed"].includes(t.status));
      const paidInvoices = invoices.filter(i => i.status === "paid");
      const totalRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);

      return {
        totalRevenue,
        activeDeals: activeDeals.length,
        totalDealValue,
        teamMembers: employees.length,
        openTickets: openTickets.length,
      };
    },
  });

  const hasAccess = (requiredRoles?: string[]) => {
    if (!requiredRoles) return true;
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  // Build metrics from real data with navigation targets
  const metrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(realMetrics?.totalRevenue || 0),
      change: 0,
      changeLabel: "from paid invoices",
      icon: DollarSign,
      color: "finance" as const,
      requiredRoles: ["admin", "manager"],
      navigateTo: "billing",
    },
    {
      title: "Active Deals",
      value: String(realMetrics?.activeDeals || 0),
      change: 0,
      changeLabel: formatCurrency(realMetrics?.totalDealValue || 0) + " pipeline",
      icon: Target,
      color: "sales" as const,
      requiredRoles: ["admin", "manager"],
      navigateTo: "sales",
    },
    {
      title: "Team Members",
      value: String(realMetrics?.teamMembers || 0),
      change: 0,
      changeLabel: "registered employees",
      icon: Users,
      color: "hr" as const,
      requiredRoles: ["admin", "manager"],
      navigateTo: "hr",
    },
    {
      title: "Open Tickets",
      value: String(realMetrics?.openTickets || 0),
      change: 0,
      changeLabel: "pending resolution",
      icon: Ticket,
      color: "support" as const,
      requiredRoles: ["admin", "manager"],
      navigateTo: "support",
    },
  ].filter((m) => hasAccess(m.requiredRoles));

  // Build modules from real data
  const modules = [
    {
      id: "sales",
      title: "Sales",
      description: "MEDDIC workflow, quotations & lead tracking",
      icon: TrendingUp,
      color: "sales" as const,
      stats: [
        { label: "Pipeline", value: formatCurrency(realMetrics?.totalDealValue || 0) },
        { label: "Active", value: String(realMetrics?.activeDeals || 0) },
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
        { label: "Revenue", value: formatCurrency(realMetrics?.totalRevenue || 0) },
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
        { label: "Employees", value: String(realMetrics?.teamMembers || 0) },
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
        { label: "Open", value: String(realMetrics?.openTickets || 0) },
      ],
      requiredRoles: ["admin", "manager"],
    },
    {
      id: "employee",
      title: "Employee Portal",
      description: "Attendance, requests & documentation",
      icon: UserCircle,
      color: "employee" as const,
      stats: [],
    },
  ].filter((m) => hasAccess(m.requiredRoles));

  // Check if user has any team assignment for team-specific widgets
  const hasTeamAssignment = teams.length > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Section */}
      <DashboardHeader profile={profile} isAdmin={isAdmin} isManager={isManager} />

      {/* Motivational Quote Widget - For all users */}
      <MotivationalQuoteWidget />

      {/* MEDDIC Workflow Quick Access - For Admin/Manager */}
      {(isAdmin || isManager) && (
        <Card 
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 cursor-pointer hover:shadow-md transition-all group"
          onClick={() => onModuleChange("sales-meddic-workflow")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">MEDDIC Workflow</h3>
                <p className="text-sm text-muted-foreground">Qualify deals with MEDDIC methodology</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              Open <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid - Only for Admin/Manager */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {metrics.map((metric, index) => (
            <PremiumMetricCard 
              key={metric.title} 
              {...metric} 
              delay={index * 100} 
              onClick={() => onModuleChange(metric.navigateTo)}
            />
          ))}
        </div>
      )}

      {/* Main Content Grid - Only for Admin/Manager */}
      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 relative pt-8">
            <DraggableWidgetContainer
              widgets={[
                { id: "revenue-chart", component: <RevenueChart onNavigate={onModuleChange} /> },
                { id: "meddic-pipeline", component: <MEDDICPipeline onNavigate={onModuleChange} /> },
              ]}
              widgetConfigs={getWidgetsByIds(["revenue-chart", "meddic-pipeline"])}
              onReorder={reorderWidgets}
              className="space-y-6"
              strategy="vertical"
            />
          </div>
          
          {/* Right Column - Widgets */}
          <div className="relative pt-8">
            <DraggableWidgetContainer
              widgets={[
                { id: "cyber-news", component: <SecurityCenterWidget /> },
                { id: "notifications", component: <NotificationCenterWidget /> },
                { id: "currency-converter", component: <CurrencyConverterWidget /> },
                { id: "upcoming-events", component: <UpcomingEventsWidget onNavigate={onModuleChange} /> },
                { id: "quick-actions", component: <QuickActions onNavigate={onModuleChange} /> },
                { id: "pending-approvals", component: <PendingApprovalsWidget onNavigate={onModuleChange} /> },
                { id: "upcoming-followups", component: <UpcomingFollowUps onNavigate={onModuleChange} /> },
                { id: "upcoming-tasks", component: <UpcomingTasks onNavigate={onModuleChange} /> },
              ]}
              widgetConfigs={getWidgetsByIds([
                "cyber-news",
                "notifications",
                "currency-converter",
                "upcoming-events",
                "quick-actions",
                "pending-approvals",
                "upcoming-followups",
                "upcoming-tasks",
              ])}
              onReorder={reorderWidgets}
              className="space-y-6"
              strategy="vertical"
            />
          </div>
        </div>
      )}

      {/* Employee-Specific Widgets - For non-admin/manager users */}
      {!isAdmin && !isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EmployeeWidgets onNavigate={onModuleChange} />
          </div>
          <div className="space-y-6">
            <SecurityCenterWidget />
            <UpcomingEventsWidget onNavigate={onModuleChange} />
          </div>
        </div>
      )}

      {/* Sales Dashboard Widgets - Only for Admin/Manager */}
      {(isAdmin || isManager) && (
        <div>
          <h2 
            className="text-xl font-semibold mb-4 cursor-pointer hover:text-primary transition-colors inline-block"
            onClick={() => onModuleChange("sales")}
          >
            Sales Overview →
          </h2>
          <SalesWidgets onNavigate={onModuleChange} />
        </div>
      )}

      {/* Team-Specific Widgets - For users with team assignments who aren't admin/manager */}
      {!isAdmin && !isManager && hasTeamAssignment && (
        <TeamSpecificWidgets onNavigate={onModuleChange} />
      )}

      {/* Modules Section */}
      <div>
        <h2 className="text-xl font-semibold mb-5">
          {isAdmin || isManager ? "Role-Based Dashboards" : "Your Tools"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {modules.map((module, index) => (
            <PremiumModuleCard
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
        <div className="relative pt-8">
          <DraggableWidgetContainer
            widgets={[
              { id: "activity-feed", component: <ActivityFeed onNavigate={onModuleChange} /> },
              { id: "team-performance", component: <TeamPerformance onNavigate={onModuleChange} /> },
            ]}
            widgetConfigs={getWidgetsByIds(["activity-feed", "team-performance"])}
            onReorder={reorderWidgets}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            strategy="grid"
            columns={2}
          />
        </div>
      )}
    </div>
  );
}
