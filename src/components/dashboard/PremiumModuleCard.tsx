import { cn } from "@/lib/utils";
import { LucideIcon, ArrowRight } from "lucide-react";

interface PremiumModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  stats?: { label: string; value: string }[];
  metric?: { label: string; value: string };
  color: "sales" | "finance" | "hr" | "tech" | "support" | "marketing" | "management" | "employee";
  onClick: () => void;
  delay?: number;
}

const iconGradientClasses = {
  sales: "icon-gradient-sales",
  finance: "icon-gradient-finance",
  hr: "icon-gradient-hr",
  tech: "icon-gradient-tech",
  support: "icon-gradient-support",
  marketing: "icon-gradient-marketing",
  management: "icon-gradient-management",
  employee: "icon-gradient-employee",
};

const hoverBorderClasses = {
  sales: "hover:border-sales/40",
  finance: "hover:border-finance/40",
  hr: "hover:border-hr/40",
  tech: "hover:border-tech/40",
  support: "hover:border-support/40",
  marketing: "hover:border-marketing/40",
  management: "hover:border-management/40",
  employee: "hover:border-employee/40",
};

const actionColorClasses = {
  sales: "text-sales hover:text-sales",
  finance: "text-finance hover:text-finance",
  hr: "text-hr hover:text-hr",
  tech: "text-tech hover:text-tech",
  support: "text-support hover:text-support",
  marketing: "text-marketing hover:text-marketing",
  management: "text-management hover:text-management",
  employee: "text-employee hover:text-employee",
};

export function PremiumModuleCard({
  title,
  description,
  icon: Icon,
  stats,
  metric,
  color,
  onClick,
  delay = 0,
}: PremiumModuleCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "premium-card p-6 cursor-pointer group animate-fade-in",
        hoverBorderClasses[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center mb-5",
          "transition-all duration-300 group-hover:scale-110 group-hover:rotate-2",
          iconGradientClasses[color]
        )}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>

      {/* Title & Description */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>

      {/* Metric Badge (single metric) */}
      {metric && (
        <div className="metric-badge mb-4">
          <span className="text-sm text-muted-foreground">{metric.label}</span>
          <span className="text-sm font-semibold text-foreground">{metric.value}</span>
        </div>
      )}

      {/* Stats Grid (multiple stats) */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {stats.map((stat, index) => (
            <div key={index} className="metric-badge">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <span className="text-sm font-semibold text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Link */}
      <div
        className={cn(
          "action-link mt-auto",
          actionColorClasses[color]
        )}
      >
        <span>Open Dashboard</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}
