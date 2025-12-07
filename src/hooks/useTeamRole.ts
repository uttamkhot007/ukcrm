import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export type TeamDashboardType = 
  | "admin" 
  | "sales_manager" 
  | "sales_rep" 
  | "presales_manager" 
  | "presales_rep" 
  | "accounts"
  | "renewal"
  | "employee";

export function useTeamRole() {
  const { isAdmin, isManager, teams, role } = useAuth();

  const dashboardType = useMemo((): TeamDashboardType => {
    // Admin gets admin dashboard
    if (isAdmin) return "admin";

    // Check team memberships
    const isSalesTeam = teams.includes("sales") || teams.includes("inside_sales");
    const isPresalesTeam = teams.includes("presales");
    const isAccountsTeam = teams.includes("accounts") || teams.includes("finance");
    const isRenewalTeam = teams.includes("renewals");
    const isManagementTeam = teams.includes("management");

    // Manager with specific team gets manager dashboard for that team
    if (isManager || isManagementTeam) {
      if (isSalesTeam) return "sales_manager";
      if (isPresalesTeam) return "presales_manager";
      return "admin"; // Generic manager gets admin-like dashboard
    }

    // Regular team members
    if (isSalesTeam) return "sales_rep";
    if (isPresalesTeam) return "presales_rep";
    if (isAccountsTeam) return "accounts";
    if (isRenewalTeam) return "renewal";

    // Default to employee dashboard
    return "employee";
  }, [isAdmin, isManager, teams, role]);

  const isTeamManager = useMemo(() => {
    return dashboardType === "sales_manager" || dashboardType === "presales_manager";
  }, [dashboardType]);

  const canViewTeamCalendar = useMemo(() => {
    return isAdmin || isManager || dashboardType.includes("manager");
  }, [isAdmin, isManager, dashboardType]);

  const canViewPresalesCalendar = useMemo(() => {
    return isAdmin || 
           isManager || 
           dashboardType === "sales_rep" || 
           dashboardType === "sales_manager" ||
           dashboardType.includes("presales");
  }, [isAdmin, isManager, dashboardType]);

  return {
    dashboardType,
    isTeamManager,
    canViewTeamCalendar,
    canViewPresalesCalendar,
  };
}
