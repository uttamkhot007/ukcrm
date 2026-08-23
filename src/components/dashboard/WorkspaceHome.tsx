import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTeamRole } from "@/hooks/useTeamRole";
import { SalesRepDashboard } from "./SalesRepDashboard";
import { SalesManagerDashboard } from "./SalesManagerDashboard";
import { PresalesDashboard } from "./PresalesDashboard";
import { InsideSalesDashboard } from "./InsideSalesDashboard";
import { AccountsDashboard } from "./AccountsDashboard";
import { RenewalDashboard } from "./RenewalDashboard";
import { EmployeeWidgets } from "./EmployeeWidgets";
import { TeamSpecificWidgets } from "./TeamSpecificWidgets";
import { NotificationCenterWidget } from "./NotificationCenterWidget";
import { UpcomingEventsWidget } from "./UpcomingEventsWidget";
import { MotivationalQuoteWidget } from "./MotivationalQuoteWidget";

interface WorkspaceHomeProps {
  onModuleChange: (module: string) => void;
}

/**
 * Role-scoped workspace home.
 *
 * The retired "Welcome back" aggregate dashboard (metric grid + module card
 * grid) has been removed from the codebase. Platform admins never render this
 * view at all — they belong in the Platform Console.
 */
export function WorkspaceHome({ onModuleChange }: WorkspaceHomeProps) {
  const { isPlatformAdmin, teams } = useAuth();
  const { dashboardType } = useTeamRole();

  if (isPlatformAdmin) {
    return <Navigate to="/admin/platform/tenants" replace />;
  }

  const roleView = (() => {
    switch (dashboardType) {
      case "sales_rep":
        return <SalesRepDashboard onNavigate={onModuleChange} />;
      case "sales_manager":
        return <SalesManagerDashboard onNavigate={onModuleChange} />;
      case "presales_rep":
        return <PresalesDashboard onNavigate={onModuleChange} isManager={false} />;
      case "presales_manager":
        return <PresalesDashboard onNavigate={onModuleChange} isManager={true} />;
      case "inside_sales":
        return <InsideSalesDashboard onNavigate={onModuleChange} />;
      case "accounts":
        return <AccountsDashboard onNavigate={onModuleChange} />;
      case "renewal":
        return <RenewalDashboard onNavigate={onModuleChange} />;
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-6 p-6">
      <MotivationalQuoteWidget />

      {roleView ?? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EmployeeWidgets onNavigate={onModuleChange} />
            {teams.length > 0 && <TeamSpecificWidgets onNavigate={onModuleChange} />}
          </div>
          <div className="space-y-6">
            <NotificationCenterWidget />
            <UpcomingEventsWidget onNavigate={onModuleChange} />
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceHome;
