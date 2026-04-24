import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  TrendingUp, 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  Loader2,
  Video,
  FileText
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  deal_id: string;
  user_id: string | null;
  deal?: {
    title: string;
  };
}

const activityIcons: Record<string, typeof ArrowRight> = {
  stage_change: ArrowRight,
  substage_change: TrendingUp,
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  video_call: Video,
  document: FileText,
};

const activityColors: Record<string, string> = {
  stage_change: "bg-blue-500/20 text-blue-400",
  substage_change: "bg-purple-500/20 text-purple-400",
  note: "bg-amber-500/20 text-amber-400",
  call: "bg-emerald-500/20 text-emerald-400",
  email: "bg-pink-500/20 text-pink-400",
  meeting: "bg-cyan-500/20 text-cyan-400",
  video_call: "bg-indigo-500/20 text-indigo-400",
  document: "bg-orange-500/20 text-orange-400",
};

interface ActivityTimelineProps {
  dealId?: string;
  limit?: number;
  showDealTitle?: boolean;
}

export function ActivityTimeline({ dealId, limit = 20, showDealTitle = true }: ActivityTimelineProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["deal-activities", dealId, limit],
    queryFn: async () => {
      let query = supabase
        .from("deal_activities")
        .select("*, deal:deals(title)")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (dealId) {
        query = query.eq("deal_id", dealId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Activity[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.activity_type] || MessageSquare;
            const colorClass = activityColors[activity.activity_type] || "bg-muted text-muted-foreground";
            
            return (
              <div key={activity.id} className="relative pl-10">
                <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <Card className="p-3 glass border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      {showDealTitle && activity.deal?.title && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Deal: {activity.deal.title}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {activity.activity_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    {" · "}
                    {format(new Date(activity.created_at), "MMM d, h:mm a")}
                  </p>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
