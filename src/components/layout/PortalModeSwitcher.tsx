import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Briefcase, UserCircle } from "lucide-react";

export function PortalModeSwitcher() {
  const { portalMode, setPortalMode, hasSalesAccess, isManagement, isAdmin } = useAuth();

  // Hide for Admin/Management - they see all modules
  // Only show for sales team users who need to switch
  if (!hasSalesAccess || isManagement || isAdmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setPortalMode("employee")}
        className={cn(
          "h-8 px-3 text-xs font-medium transition-all",
          portalMode === "employee"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <UserCircle className="w-4 h-4 mr-1.5" />
        Employee
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setPortalMode("sales")}
        className={cn(
          "h-8 px-3 text-xs font-medium transition-all",
          portalMode === "sales"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Briefcase className="w-4 h-4 mr-1.5" />
        Sales
      </Button>
    </div>
  );
}
