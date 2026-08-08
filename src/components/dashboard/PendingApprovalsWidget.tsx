import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  Calendar,
  Home,
  DollarSign,
  Monitor,
  Wrench,
  HelpCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  User,
  ClipboardCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PendingApprovalsWidgetProps {
  onNavigate: (module: string) => void;
}

const REQUEST_TYPE_ICONS: Record<string, React.ElementType> = {
  leave: Calendar,
  work_from_home: Home,
  advance_salary: DollarSign,
  new_hardware: Monitor,
  hardware_problem: Wrench,
  other: HelpCircle,
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  leave: "Leave",
  work_from_home: "WFH",
  advance_salary: "Advance",
  new_hardware: "Hardware",
  hardware_problem: "Issue",
  other: "Other",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-600",
  high: "bg-orange-500/10 text-orange-600",
  urgent: "bg-red-500/10 text-red-600 animate-pulse",
};

export function PendingApprovalsWidget({ onNavigate }: PendingApprovalsWidgetProps) {
  const { isAdmin, isManager } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["pending-approvals-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("*")
        .in("status", ["pending", "under_review"])
        .order("sla_deadline", { ascending: true })
        .limit(5);

      if (error) throw error;

      // Fetch requester names
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return data.map(request => ({
        ...request,
        requester_name: profileMap.get(request.user_id) || "Unknown"
      }));
    },
    enabled: isAdmin || isManager,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: stats } = useQuery({
    queryKey: ["pending-approvals-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("status, sla_deadline")
        .in("status", ["pending", "under_review"]);

      if (error) throw error;

      const overdue = data.filter(r => r.sla_deadline && isPast(new Date(r.sla_deadline))).length;
      
      return {
        total: data.length,
        overdue
      };
    },
    enabled: isAdmin || isManager,
    refetchInterval: 60000,
  });

  if (!isAdmin && !isManager) return null;

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Pending Approvals
          </CardTitle>
          {stats && stats.total > 0 && (
            <div className="flex items-center gap-2">
              {stats.overdue > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  {stats.overdue} overdue
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {stats.total} pending
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!requests || requests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pending approvals</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[280px] pr-2">
              <div className="space-y-3">
                {requests.map((request) => {
                  const Icon = REQUEST_TYPE_ICONS[request.type] || HelpCircle;
                  const isOverdue = request.sla_deadline && isPast(new Date(request.sla_deadline));

                  return (
                    <div
                      key={request.id}
                      className={`p-3 rounded-lg border transition-all hover:bg-muted/50 cursor-pointer ${
                        isOverdue ? "border-red-500/30 bg-red-500/5" : ""
                      }`}
                      onClick={() => onNavigate("employee-approvals")}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isOverdue ? "bg-red-500/10" : "bg-primary/10"}`}>
                          <Icon className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-primary"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium truncate">{request.title}</p>
                            <Badge variant="outline" className={`text-xs ${PRIORITY_STYLES[request.priority]}`}>
                              {request.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="truncate">{request.requester_name}</span>
                            <span>•</span>
                            <span>{REQUEST_TYPE_LABELS[request.type]}</span>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            {isOverdue ? (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>SLA breached</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>
                                  Due {request.sla_deadline 
                                    ? formatDistanceToNow(new Date(request.sla_deadline), { addSuffix: true })
                                    : "soon"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {stats && stats.total > 5 && (
              <Button
                variant="ghost"
                className="w-full mt-3 text-sm"
                onClick={() => onNavigate("employee-approvals")}
              >
                View all {stats.total} pending requests
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {stats && stats.total <= 5 && (
              <Button
                variant="outline"
                className="w-full mt-3 text-sm"
                onClick={() => onNavigate("employee-approvals")}
              >
                Go to Approvals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
