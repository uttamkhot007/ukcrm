import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, Headphones, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type ViewMode = "admin" | "workspace" | "customer";

export function PortalModeSwitcher() {
  const { portalMode, setPortalMode, isCustomer, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Customers can only see customer portal - no switcher needed
  if (isCustomer && !isAdmin && !isSuperAdmin) {
    return null;
  }

  // Non-admin, non-super-admin employees don't need switcher
  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  const modes: { value: ViewMode; label: string; icon: React.ElementType; description: string }[] = [
    { 
      value: "admin", 
      label: "Admin Mode", 
      icon: Shield,
      description: "Full access to all modules"
    },
    { 
      value: "workspace", 
      label: "My Workspace", 
      icon: Building2,
      description: "Employee portal view"
    },
    { 
      value: "customer", 
      label: "Customer Portal", 
      icon: Headphones,
      description: "Helpdesk only access"
    },
  ];

  const currentModeData = modes.find(m => m.value === portalMode) || modes[0];
  const CurrentIcon = currentModeData.icon;

  const handleModeChange = (mode: ViewMode) => {
    setPortalMode(mode);
    // Navigate to home when switching modes (especially when on /admin routes)
    if (location.pathname.startsWith('/admin')) {
      navigate('/');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{currentModeData.label}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 hidden lg:flex">
            Preview
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.value === portalMode;
          return (
            <DropdownMenuItem
              key={mode.value}
              onClick={() => handleModeChange(mode.value)}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer",
                isActive && "bg-accent"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mt-0.5",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="flex-1">
                <div className={cn(
                  "font-medium text-sm",
                  isActive && "text-primary"
                )}>
                  {mode.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {mode.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
