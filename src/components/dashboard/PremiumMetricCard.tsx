import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface PremiumMetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: "sales" | "finance" | "hr" | "tech" | "support" | "marketing" | "management" | "employee";
  delay?: number;
  onClick?: () => void;
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

export function PremiumMetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  delay = 0,
  onClick,
}: PremiumMetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "premium-card p-5 cursor-pointer group animate-fade-in",
        hoverBorderClasses[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            "transition-all duration-300 group-hover:scale-110 group-hover:rotate-2",
            iconGradientClasses[color]
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Change Badge */}
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              "bg-muted/60",
              isPositive ? "text-primary" : "text-destructive"
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      {/* Value & Title */}
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-1 tracking-tight">{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
        {changeLabel && (
          <p className="text-xs text-muted-foreground mt-1 opacity-70">{changeLabel}</p>
        )}
      </div>

      {/* Hover Arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}
