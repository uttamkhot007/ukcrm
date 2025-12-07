import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface ModuleNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface ModuleVerticalNavProps {
  items: ModuleNavItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

export function ModuleVerticalNav({
  items,
  activeTab,
  onTabChange,
  className,
}: ModuleVerticalNavProps) {
  return (
    <nav className={cn("w-48 shrink-0 space-y-1", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.value;
        
        return (
          <button
            key={item.value}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              "hover:bg-muted/80",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "ml-auto text-xs px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
