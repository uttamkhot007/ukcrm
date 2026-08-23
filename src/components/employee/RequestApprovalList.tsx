import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Home,
  DollarSign,
  Monitor,
  Wrench,
  HelpCircle,
  Eye,
  AlertTriangle,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RequestApprovalListProps {
  statusFilter: string | null;
  teamFilter: string | null;
  onSelectRequest: (id: string) => void;
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
  work_from_home: "Work from Home",
  advance_salary: "Advance Salary",
  new_hardware: "New Hardware",
  hardware_problem: "Hardware Problem",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  under_review: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  approved: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-600",
  high: "bg-orange-500/10 text-orange-600",
  urgent: "bg-red-500/10 text-red-600",
};

type RequestStatus = "pending" | "under_review" | "approved" | "rejected" | "completed" | "cancelled";

export function RequestApprovalList({ statusFilter, teamFilter, onSelectRequest }: RequestApprovalListProps) {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["all-employee-requests", statusFilter, teamFilter],
    queryFn: async () => {
      let query = supabase
        .from("employee_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter as RequestStatus);
      }

      if (teamFilter) {
        query = query.eq("assigned_team", teamFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch requester names
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(request => ({
        ...request,
        requester: profileMap.get(request.user_id) || { full_name: "Unknown", email: "" }
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No requests found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request #</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Team</TableHead>
          <TableHead>SLA</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => {
          const Icon = REQUEST_TYPE_ICONS[request.type] || HelpCircle;
          const isOverdue = request.sla_deadline && isPast(new Date(request.sla_deadline)) 
            && !["approved", "rejected", "completed", "cancelled"].includes(request.status);
          
          return (
            <TableRow key={request.id} className={isOverdue ? "bg-red-500/5" : ""}>
              <TableCell className="font-mono text-sm">
                {request.request_number}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{request.requester?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{request.requester?.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {REQUEST_TYPE_LABELS[request.type] || request.type}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-medium max-w-[150px] truncate">
                {request.title}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={PRIORITY_STYLES[request.priority]}>
                  {request.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLES[request.status]}>
                  {request.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {request.assigned_team || "-"}
              </TableCell>
              <TableCell>
                {request.sla_deadline ? (
                  <div className={`flex items-center gap-1 text-sm ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    {isOverdue && <AlertTriangle className="w-3 h-3" />}
                    {isOverdue 
                      ? "Overdue" 
                      : formatDistanceToNow(new Date(request.sla_deadline), { addSuffix: true })}
                  </div>
                ) : "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(request.submitted_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectRequest(request.id)}
                  className="gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Review
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
