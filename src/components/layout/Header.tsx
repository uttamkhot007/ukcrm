import { Bell, Search, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { PortalModeSwitcher } from "./PortalModeSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface HeaderProps {
  onAIToggle: () => void;
}

export function Header({ onAIToggle }: HeaderProps) {
  const { profile, role } = useAuth();

  const getRoleBadgeColor = () => {
    switch (role) {
      case "admin":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "manager":
        return "bg-management/20 text-management border-management/30";
      default:
        return "bg-employee/20 text-employee border-employee/30";
    }
  };

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search anything..."
            className="pl-10 bg-muted/50 border-border focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        
        <PortalModeSwitcher />
        
        <Button
          variant="glass"
          size="icon"
          onClick={onAIToggle}
          className="relative group"
        >
          <Sparkles className="w-5 h-5 text-primary group-hover:animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
            5
          </span>
        </Button>

        <Button variant="ghost" size="icon">
          <MessageSquare className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 ml-3 pl-3 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize border", getRoleBadgeColor())}>
              {role || "employee"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
            {profile?.full_name?.slice(0, 2).toUpperCase() || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
