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
    <ScrollArea className={cn("w-full", className)}>
      <div className="flex items-center gap-2 pb-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          
          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                "hover:bg-muted/80 border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:border-border"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
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
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
