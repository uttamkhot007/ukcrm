import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: LucideIcon;
  color: "sales" | "finance" | "hr" | "tech" | "support" | "marketing" | "management" | "employee";
  delay?: number;
  onClick?: () => void;
}

const colorClasses = {
  sales: "text-sales border-sales/20 glow-sales",
  finance: "text-finance border-finance/20 glow-finance",
  hr: "text-hr border-hr/20 glow-hr",
  tech: "text-tech border-tech/20 glow-tech",
  support: "text-support border-support/20 glow-support",
  marketing: "text-marketing border-marketing/20 glow-marketing",
  management: "text-management border-management/20 glow-management",
  employee: "text-employee border-employee/20",
};

const bgClasses = {
  sales: "bg-sales/10",
  finance: "bg-finance/10",
  hr: "bg-hr/10",
  tech: "bg-tech/10",
  support: "bg-support/10",
  marketing: "bg-marketing/10",
  management: "bg-management/10",
  employee: "bg-employee/10",
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  delay = 0,
  onClick,
}: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <div
      className={cn(
        "glass rounded-xl p-5 border hover:border-opacity-40 transition-all duration-300 group cursor-pointer hover:scale-[1.02]",
        colorClasses[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            bgClasses[color]
          )}
        >
          <Icon className={cn("w-6 h-6", `text-${color}`)} />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
            isPositive
              ? "text-primary bg-primary/10"
              : "text-destructive bg-destructive/10"
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {Math.abs(change)}%
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
      </div>
    </div>
  );
}
