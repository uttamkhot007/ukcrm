import { cn } from "@/lib/utils";
import { Star, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Skeleton } from "@/components/ui/skeleton";

interface TopPerformer {
  id: string;
  name: string;
  role: string;
  avatar: string;
  dealsCount: number;
  totalValue: number;
}

interface TeamPerformanceProps {
  onNavigate?: (module: string) => void;
}

export function TeamPerformance({ onNavigate }: TeamPerformanceProps) {
  const { formatCurrency } = useOrganizationSettings();

  const { data: performers, isLoading } = useQuery({
    queryKey: ["team-performance"],
    queryFn: async () => {
      // Get deals with assigned users
      const { data: deals } = await supabase
        .from("deals")
        .select("assigned_to, value, stage")
        .eq("stage", "closed_won");

      if (!deals || deals.length === 0) return [];

      // Group by assigned_to
      const performerMap = new Map<string, { dealsCount: number; totalValue: number }>();
      
      deals.forEach(deal => {
        if (deal.assigned_to) {
          const existing = performerMap.get(deal.assigned_to) || { dealsCount: 0, totalValue: 0 };
          performerMap.set(deal.assigned_to, {
            dealsCount: existing.dealsCount + 1,
            totalValue: existing.totalValue + (Number(deal.value) || 0),
          });
        }
      });

      // Get profile info for each performer
      const userIds = Array.from(performerMap.keys());
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, job_title")
        .in("user_id", userIds);

      const result: TopPerformer[] = [];
      
      performerMap.forEach((stats, userId) => {
        const profile = profiles?.find(p => p.user_id === userId);
        if (profile) {
          result.push({
            id: userId,
            name: profile.full_name || "Unknown",
            role: profile.job_title || "Sales Rep",
            avatar: (profile.full_name || "U").slice(0, 2).toUpperCase(),
            dealsCount: stats.dealsCount,
            totalValue: stats.totalValue,
          });
        }
      });

      // Sort by total value descending
      return result.sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);
    },
  });

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 border border-border animate-fade-in">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div 
        className="flex items-center justify-between mb-6 cursor-pointer hover:opacity-80"
        onClick={() => onNavigate?.("hr")}
      >
        <h3 className="text-lg font-semibold">Top Performers</h3>
      </div>

      {(!performers || performers.length === 0) ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No closed deals yet to show performers</p>
        </div>
      ) : (
        <div className="space-y-4">
          {performers.map((member, index) => (
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
                    {member.dealsCount} deals
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(member.totalValue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
