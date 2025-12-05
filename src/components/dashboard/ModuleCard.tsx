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
  sales: "bg-sales/10 text-sales",
  finance: "bg-finance/10 text-finance",
  hr: "bg-hr/10 text-hr",
  tech: "bg-tech/10 text-tech",
  support: "bg-support/10 text-support",
  marketing: "bg-marketing/10 text-marketing",
  management: "bg-management/10 text-management",
  employee: "bg-employee/10 text-employee",
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
        "glass rounded-xl p-6 border cursor-pointer transition-all duration-300 group animate-fade-in",
        colorClasses[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            iconBgClasses[color]
          )}
        >
          <Icon className="w-7 h-7" />
        </div>
        <ArrowRight
          className={cn(
            "w-5 h-5 text-muted-foreground transition-all group-hover:translate-x-1",
            colorClasses[color]
          )}
        />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-muted/30 rounded-lg p-2">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
