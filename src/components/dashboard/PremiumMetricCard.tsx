import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

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

const glowOnHoverClasses = {
  sales: "hover:shadow-[0_0_30px_-5px_hsl(var(--sales)/0.3)]",
  finance: "hover:shadow-[0_0_30px_-5px_hsl(var(--finance)/0.3)]",
  hr: "hover:shadow-[0_0_30px_-5px_hsl(var(--hr)/0.3)]",
  tech: "hover:shadow-[0_0_30px_-5px_hsl(var(--tech)/0.3)]",
  support: "hover:shadow-[0_0_30px_-5px_hsl(var(--support)/0.3)]",
  marketing: "hover:shadow-[0_0_30px_-5px_hsl(var(--marketing)/0.3)]",
  management: "hover:shadow-[0_0_30px_-5px_hsl(var(--management)/0.3)]",
  employee: "hover:shadow-[0_0_30px_-5px_hsl(var(--employee)/0.3)]",
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
        "premium-card p-5 cursor-pointer group",
        "opacity-0 animate-fade-in",
        hoverBorderClasses[color],
        glowOnHoverClasses[color]
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        {/* Icon with enhanced glow */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
            iconGradientClasses[color]
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Change Badge */}
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
              "transition-all duration-300",
              isPositive 
                ? "bg-primary/10 text-primary" 
                : "bg-destructive/10 text-destructive"
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

      {/* Value with animated counter */}
      <div>
        <h3 className="text-2xl font-display font-bold text-foreground mb-1 tracking-tight">
          <AnimatedCounter value={value} duration={1200} />
        </h3>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {changeLabel && (
          <p className="text-xs text-muted-foreground/70 mt-1">{changeLabel}</p>
        )}
      </div>

      {/* Hover Arrow with animation */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </div>
  );
}
