import { cn } from "@/lib/utils";
import {
  FileText,
  UserPlus,
  DollarSign,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  type: "deal" | "hire" | "payment" | "task" | "alert" | "message";
  title: string;
  description: string;
  time: string;
  user?: string;
}

const typeConfig = {
  deal: { icon: FileText, color: "text-sales bg-sales/10" },
  hire: { icon: UserPlus, color: "text-hr bg-hr/10" },
  payment: { icon: DollarSign, color: "text-finance bg-finance/10" },
  task: { icon: CheckCircle, color: "text-tech bg-tech/10" },
  alert: { icon: AlertCircle, color: "text-support bg-support/10" },
  message: { icon: MessageSquare, color: "text-marketing bg-marketing/10" },
};

interface ActivityFeedProps {
  onNavigate?: (module: string) => void;
}

export function ActivityFeed({ onNavigate }: ActivityFeedProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      const result: ActivityItem[] = [];

      // Get recent deal activities
      const { data: dealActivities } = await supabase
        .from("deal_activities")
        .select("id, activity_type, description, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      dealActivities?.forEach(activity => {
        result.push({
          id: `deal-${activity.id}`,
          type: "deal",
          title: activity.activity_type.replace(/_/g, " "),
          description: activity.description,
          time: formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }),
        });
      });

      // Get recent tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      tickets?.forEach(ticket => {
        result.push({
          id: `ticket-${ticket.id}`,
          type: "alert",
          title: `Ticket: ${ticket.status}`,
          description: ticket.title,
          time: formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }),
        });
      });

      // Sort all by time and take top 8
      return result.slice(0, 8);
    },
  });

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 border border-border animate-fade-in">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
      </div>

      {(!activities || activities.length === 0) ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No recent activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const config = typeConfig[activity.type];
            const Icon = config.icon;

            return (
              <div
                key={activity.id}
                className="flex gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => {
                  // Navigate based on activity type
                  if (activity.type === "deal") onNavigate?.("sales");
                  else if (activity.type === "alert") onNavigate?.("support");
                  else if (activity.type === "hire") onNavigate?.("hr");
                  else if (activity.type === "payment") onNavigate?.("billing");
                }}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    config.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate capitalize">
                      {activity.title}
                    </h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                  {activity.user && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {activity.user}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
