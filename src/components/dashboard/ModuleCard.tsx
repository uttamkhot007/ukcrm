import { cn } from "@/lib/utils";
import { LucideIcon, ArrowRight } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  stats: { label: string; value: string }[];
  color: "sales" | "finance" | "hr" | "tech" | "support" | "marketing" | "management" | "employee";
  onClick: () => void;
  delay?: number;
}

const colorClasses = {
  sales: "hover:border-sales/50 group-hover:text-sales",
  finance: "hover:border-finance/50 group-hover:text-finance",
  hr: "hover:border-hr/50 group-hover:text-hr",
  tech: "hover:border-tech/50 group-hover:text-tech",
  support: "hover:border-support/50 group-hover:text-support",
  marketing: "hover:border-marketing/50 group-hover:text-marketing",
  management: "hover:border-management/50 group-hover:text-management",
  employee: "hover:border-employee/50 group-hover:text-employee",
};

const iconBgClasses = {
  sales: "bg-sales/10 text-sales group-hover:bg-sales/20",
  finance: "bg-finance/10 text-finance group-hover:bg-finance/20",
  hr: "bg-hr/10 text-hr group-hover:bg-hr/20",
  tech: "bg-tech/10 text-tech group-hover:bg-tech/20",
  support: "bg-support/10 text-support group-hover:bg-support/20",
  marketing: "bg-marketing/10 text-marketing group-hover:bg-marketing/20",
  management: "bg-management/10 text-management group-hover:bg-management/20",
  employee: "bg-employee/10 text-employee group-hover:bg-employee/20",
};

const glowClasses = {
  sales: "group-hover:glow-sales",
  finance: "group-hover:glow-finance",
  hr: "group-hover:glow-hr",
  tech: "group-hover:glow-tech",
  support: "group-hover:glow-support",
  marketing: "group-hover:glow-marketing",
  management: "group-hover:glow-management",
  employee: "",
};

export function ModuleCard({
  title,
  description,
  icon: Icon,
  stats,
  color,
  onClick,
  delay = 0,
}: ModuleCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass glass-hover card-3d rounded-2xl p-6 cursor-pointer group animate-fade-in relative overflow-hidden",
        "transition-all duration-500",
        colorClasses[color],
        glowClasses[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 shimmer" />
      </div>

      {/* Inner light effect */}
      <div className="absolute inset-0 inner-light pointer-events-none rounded-2xl" />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
            "group-hover:scale-110 group-hover:rotate-3",
            "shadow-elevation-low",
            iconBgClasses[color]
          )}
        >
          <Icon className="w-7 h-7" />
        </div>
        <ArrowRight
          className={cn(
            "w-5 h-5 text-muted-foreground transition-all duration-300",
            "group-hover:translate-x-1 group-hover:text-foreground",
            colorClasses[color]
          )}
        />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1 relative z-10">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 relative z-10">{description}</p>

      <div className="grid grid-cols-2 gap-3 relative z-10">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="glass-subtle rounded-xl p-3 transition-all duration-300 group-hover:bg-muted/40"
          >
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
