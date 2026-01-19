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
  variant?: "default" | "neon" | "glass";
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
  sales: "hover:shadow-[0_0_30px_-5px_hsl(var(--sales)/0.4),0_0_50px_-10px_hsl(var(--sales)/0.2)]",
  finance: "hover:shadow-[0_0_30px_-5px_hsl(var(--finance)/0.4),0_0_50px_-10px_hsl(var(--finance)/0.2)]",
  hr: "hover:shadow-[0_0_30px_-5px_hsl(var(--hr)/0.4),0_0_50px_-10px_hsl(var(--hr)/0.2)]",
  tech: "hover:shadow-[0_0_30px_-5px_hsl(var(--tech)/0.4),0_0_50px_-10px_hsl(var(--tech)/0.2)]",
  support: "hover:shadow-[0_0_30px_-5px_hsl(var(--support)/0.4),0_0_50px_-10px_hsl(var(--support)/0.2)]",
  marketing: "hover:shadow-[0_0_30px_-5px_hsl(var(--marketing)/0.4),0_0_50px_-10px_hsl(var(--marketing)/0.2)]",
  management: "hover:shadow-[0_0_30px_-5px_hsl(var(--management)/0.4),0_0_50px_-10px_hsl(var(--management)/0.2)]",
  employee: "hover:shadow-[0_0_30px_-5px_hsl(var(--employee)/0.4),0_0_50px_-10px_hsl(var(--employee)/0.2)]",
};

// Neon accent colors for the top border glow
const neonTopBorderColors = {
  sales: "from-transparent via-sales to-transparent",
  finance: "from-transparent via-finance to-transparent",
  hr: "from-transparent via-hr to-transparent",
  tech: "from-transparent via-tech to-transparent",
  support: "from-transparent via-support to-transparent",
  marketing: "from-transparent via-marketing to-transparent",
  management: "from-transparent via-management to-transparent",
  employee: "from-transparent via-employee to-transparent",
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
  variant = "default",
}: PremiumMetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "relative p-5 cursor-pointer group rounded-2xl overflow-hidden",
        "opacity-0 animate-fade-in",
        "transition-all duration-400 ease-out",
        variant === "neon" ? "neon-card" : "premium-card",
        hoverBorderClasses[color],
        glowOnHoverClasses[color]
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
      onClick={onClick}
    >
      {/* Neon top accent line */}
      <div 
        className={cn(
          "absolute top-0 left-[15%] right-[15%] h-[2px] opacity-40 group-hover:opacity-80",
          "transition-opacity duration-300",
          "bg-gradient-to-r",
          neonTopBorderColors[color]
        )}
      />
      
      <div className="relative z-10 flex items-start justify-between mb-4">
        {/* Icon with enhanced glow */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
            iconGradientClasses[color]
          )}
        >
          <Icon className="w-6 h-6 text-white drop-shadow-sm" />
        </div>

        {/* Change Badge with glow */}
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
              "transition-all duration-300 backdrop-blur-sm",
              isPositive 
                ? "bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]" 
                : "bg-destructive/15 text-destructive shadow-[0_0_10px_hsl(var(--destructive)/0.2)]"
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
      <div className="relative z-10">
        <h3 className="text-2xl font-display font-bold text-foreground mb-1 tracking-tight">
          <AnimatedCounter value={value} duration={1200} />
        </h3>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {changeLabel && (
          <p className="text-xs text-muted-foreground/70 mt-1">{changeLabel}</p>
        )}
      </div>

      {/* Hover Arrow with animation */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 z-10">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {/* Enhanced shine sweep on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>

      {/* Subtle inner glow at bottom */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-16 opacity-0 group-hover:opacity-100",
          "transition-opacity duration-500 pointer-events-none",
          "bg-gradient-to-t from-primary/5 to-transparent"
        )}
      />
    </div>
  );
}
