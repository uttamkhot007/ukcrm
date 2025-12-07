import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, Headphones } from "lucide-react";

export function PortalModeSwitcher() {
  const { portalMode, setPortalMode, isCustomer, isAdmin } = useAuth();

  // Customers can only see customer portal - no switcher needed
  if (isCustomer) {
    return null;
  }

  // Only admins can switch between modes (for testing/support purposes)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setPortalMode("workspace")}
        className={cn(
          "h-8 px-3 text-xs font-medium transition-all",
          portalMode === "workspace"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="w-4 h-4 mr-1.5" />
        My Workspace
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setPortalMode("customer")}
        className={cn(
          "h-8 px-3 text-xs font-medium transition-all",
          portalMode === "customer"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Headphones className="w-4 h-4 mr-1.5" />
        Customer Portal
      </Button>
    </div>
  );
}
