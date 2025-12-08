import {
  Plus,
  FileText,
  UserPlus,
  Building2,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTeamRole } from "@/hooks/useTeamRole";

interface QuickActionsProps {
  onNavigate?: (module: string) => void;
}

const actions = [
  { label: "New Deal", icon: Plus, variant: "sales" as const, action: "sales" },
  { label: "Create Quote", icon: FileText, variant: "finance" as const, action: "sales" },
  { label: "Add Contact", icon: UserPlus, variant: "hr" as const, action: "sales" },
  { label: "Add Organization", icon: Building2, variant: "support" as const, action: "admin-alliance" },
  { label: "Schedule Meeting", icon: Calendar, variant: "tech" as const, action: "calendar" },
  { label: "Generate Report", icon: BarChart3, variant: "default" as const, action: "analytics" },
];

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const { isAdmin, isManager, teams } = useAuth();
  const { dashboardType } = useTeamRole();

  // Check if user is sales account manager or has sales team role
  const isSalesTeam = dashboardType === "sales_rep" || 
                      dashboardType === "sales_manager" || 
                      teams.includes("sales" as any) ||
                      teams.includes("accounts" as any);

  // Show widget for admin, manager, or sales team members
  const showWidget = isAdmin || isManager || isSalesTeam;

  if (!showWidget) {
    return null;
  }

  const handleAction = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
  };

  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto py-4 flex-col gap-2"
            onClick={() => handleAction(action.action)}
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
