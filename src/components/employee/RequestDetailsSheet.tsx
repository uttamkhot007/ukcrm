import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  Calendar,
  Home,
  DollarSign,
  Monitor,
  Wrench,
  HelpCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Loader2,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RequestDetailsSheetProps {
  requestId: string | null;
  onClose: () => void;
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
  leave: "Leave Request",
  work_from_home: "Work from Home",
  advance_salary: "Advance Salary",
  new_hardware: "New Hardware",
  hardware_problem: "Hardware Problem",
  other: "Other",
};

const STATUS_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  pending: { bg: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  under_review: { bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: AlertTriangle },
  approved: { bg: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  rejected: { bg: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  completed: { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  cancelled: { bg: "bg-muted text-muted-foreground border-muted", icon: XCircle },
};

export function RequestDetailsSheet({ requestId, onClose }: RequestDetailsSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: request, isLoading } = useQuery({
    queryKey: ["employee-request", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });

  const { data: comments } = useQuery({
    queryKey: ["request-comments", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_comments")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      // Fetch user names separately
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return data.map(comment => ({
        ...comment,
        user_name: profileMap.get(comment.user_id) || "User"
      }));
    },
    enabled: !!requestId,
  });

  const { data: history } = useQuery({
    queryKey: ["request-history", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_history")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch user names separately
      const userIds = [...new Set(data.map(h => h.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return data.map(item => ({
        ...item,
        user_name: profileMap.get(item.user_id) || "System"
      }));
    },
    enabled: !!requestId,
  });

  const handleAddComment = async () => {
    if (!newComment.trim() || !requestId || !user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("request_comments").insert({
        request_id: requestId,
        user_id: user.id,
        comment: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["request-comments", requestId] });
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestId || !user?.id) return;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("employee_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (error) throw error;

      // Add history entry
      await supabase.from("request_history").insert({
        request_id: requestId,
        user_id: user.id,
        action: "cancelled",
        old_status: request?.status,
        new_status: "cancelled",
        notes: "Request cancelled by user",
      });

      queryClient.invalidateQueries({ queryKey: ["employee-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-request", requestId] });
      toast.success("Request cancelled");
      onClose();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!requestId) return null;

  const Icon = request ? REQUEST_TYPE_ICONS[request.type] : HelpCircle;
  const statusStyle = request ? STATUS_STYLES[request.status] : STATUS_STYLES.pending;
  const StatusIcon = statusStyle.icon;
  const isOverdue = request?.sla_deadline && isPast(new Date(request.sla_deadline)) 
    && !["approved", "rejected", "completed", "cancelled"].includes(request?.status || "");
  const canCancel = request?.status === "pending" && request?.user_id === user?.id;

  return (
    <Sheet open={!!requestId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Request Details</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : request ? (
          <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
            <div className="space-y-6 pr-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">
                      {request.request_number}
                    </p>
                    <h3 className="font-semibold">{request.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {REQUEST_TYPE_LABELS[request.type]}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyle.bg}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {request.status.replace("_", " ")}
                </Badge>
              </div>

              {/* SLA Warning */}
              {isOverdue && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">SLA Breached - Response overdue</span>
                </div>
              )}

              <Separator />

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p className="font-medium capitalize">{request.priority}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned Team</p>
                  <p className="font-medium">{request.assigned_team || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {format(new Date(request.submitted_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">SLA Deadline</p>
                  <p className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                    {request.sla_deadline 
                      ? format(new Date(request.sla_deadline), "MMM d, yyyy HH:mm")
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Type-specific details */}
              {request.type === "leave" && (request.leave_start_date || request.leave_end_date) && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Leave Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {request.leave_type && (
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p>{request.leave_type}</p>
                      </div>
                    )}
                    {request.leave_start_date && (
                      <div>
                        <p className="text-muted-foreground">From</p>
                        <p>{format(new Date(request.leave_start_date), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {request.leave_end_date && (
                      <div>
                        <p className="text-muted-foreground">To</p>
                        <p>{format(new Date(request.leave_end_date), "MMM d, yyyy")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {request.type === "work_from_home" && request.wfh_date && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">WFH Details</p>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Date</p>
                    <p>{format(new Date(request.wfh_date), "MMM d, yyyy")}</p>
                    {request.wfh_reason && (
                      <>
                        <p className="text-muted-foreground mt-2">Reason</p>
                        <p>{request.wfh_reason}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {request.type === "advance_salary" && request.advance_amount && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Advance Details</p>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-semibold">₹{Number(request.advance_amount).toLocaleString()}</p>
                    {request.advance_reason && (
                      <>
                        <p className="text-muted-foreground mt-2">Reason</p>
                        <p>{request.advance_reason}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {(request.type === "new_hardware" || request.type === "hardware_problem") && request.hardware_type && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Hardware Details</p>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Type</p>
                    <p>{request.hardware_type}</p>
                    {request.hardware_description && (
                      <>
                        <p className="text-muted-foreground mt-2">Description</p>
                        <p>{request.hardware_description}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {request.description && (
                <div>
                  <p className="text-sm font-medium mb-2">Additional Details</p>
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                </div>
              )}

              <Separator />

              {/* Comments */}
              <div>
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({comments?.length || 0})
                </p>
                
                <div className="space-y-3 mb-4">
                  {comments?.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {comment.user_name || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))}
                  
                  {(!comments || comments.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet
                    </p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmitting}
                    size="icon"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* History */}
              {history && history.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Activity History</p>
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div>
                          <p>
                            <span className="font-medium">
                              {item.user_name || "System"}
                            </span>{" "}
                            {item.action}
                            {item.new_status && (
                              <> to <Badge variant="outline" className="text-xs">{item.new_status}</Badge></>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Button */}
              {canCancel && (
                <div className="pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCancelRequest}
                    disabled={isCancelling}
                  >
                    {isCancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Cancel Request
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-12">Request not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
