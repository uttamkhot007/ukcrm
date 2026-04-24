import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  Calendar,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { format, isAfter } from "date-fns";

interface EmployeeWidgetsProps {
  onNavigate: (module: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  under_review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const REQUEST_TYPE_ICONS: Record<string, typeof FileText> = {
  leave: Calendar,
  work_from_home: Briefcase,
  advance_salary: FileText,
  new_hardware: FileText,
  hardware_problem: AlertCircle,
  other: FileText,
};

export function EmployeeWidgets({ onNavigate }: EmployeeWidgetsProps) {
  const { user } = useAuth();

  // Fetch my recent requests
  const { data: myRequests } = useQuery({
    queryKey: ["my-requests-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch request stats
  const { data: requestStats } = useQuery({
    queryKey: ["my-request-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("status")
        .eq("user_id", user?.id);
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        pending: data.filter(r => r.status === "pending" || r.status === "under_review").length,
        approved: data.filter(r => r.status === "approved" || r.status === "completed").length,
        rejected: data.filter(r => r.status === "rejected").length,
      };
      return stats;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6">
      {/* Request Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{requestStats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{requestStats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{requestStats?.approved || 0}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{requestStats?.rejected || 0}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">My Recent Requests</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate("employee")}
            className="text-primary hover:text-primary/80"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {!myRequests || myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No requests yet</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => onNavigate("employee")}
              >
                Create New Request
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => {
                const Icon = REQUEST_TYPE_ICONS[request.type] || FileText;
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={STATUS_COLORS[request.status]}
                    >
                      {request.status.replace("_", " ")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
