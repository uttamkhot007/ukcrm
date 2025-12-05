import { cn } from "@/lib/utils";
import { Star, TrendingUp } from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  performance: number;
  deals: number;
  revenue: string;
}

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Sarah Mitchell",
    role: "Senior Sales Rep",
    avatar: "SM",
    performance: 98,
    deals: 24,
    revenue: "$1.2M",
  },
  {
    id: 2,
    name: "James Anderson",
    role: "Account Executive",
    avatar: "JA",
    performance: 94,
    deals: 18,
    revenue: "$890K",
  },
  {
    id: 3,
    name: "Emily Chen",
    role: "Sales Manager",
    avatar: "EC",
    performance: 91,
    deals: 15,
    revenue: "$750K",
  },
  {
    id: 4,
    name: "Michael Brown",
    role: "Business Dev",
    avatar: "MB",
    performance: 87,
    deals: 12,
    revenue: "$620K",
  },
  {
    id: 5,
    name: "Lisa Wang",
    role: "Inside Sales",
    avatar: "LW",
    performance: 85,
    deals: 22,
    revenue: "$480K",
  },
];

export function TeamPerformance() {
  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Top Performers</h3>
        <button className="text-sm text-primary hover:underline">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {teamMembers.map((member, index) => (
          <div
            key={member.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-1 w-6 text-muted-foreground text-sm">
              {index === 0 && <Star className="w-4 h-4 text-management fill-management" />}
              {index > 0 && <span>{index + 1}</span>}
            </div>

            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                index === 0
                  ? "bg-gradient-to-br from-management to-management/60 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {member.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">
                {member.name}
              </h4>
              <p className="text-xs text-muted-foreground">{member.role}</p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {member.performance}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {member.deals} deals · {member.revenue}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
