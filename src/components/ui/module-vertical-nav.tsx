import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "./scroll-area";

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
    <div className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.value;
        
        return (
          <button
            key={item.value}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full text-left",
              "hover:bg-muted/80",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full ml-auto",
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
    </div>
  );
}
