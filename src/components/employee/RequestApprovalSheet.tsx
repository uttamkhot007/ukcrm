import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { workflows } from "@/lib/workflows";
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
import { Label } from "@/components/ui/label";
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
  ThumbsUp,
  ThumbsDown,
  Eye,
  ArrowUpCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RequestApprovalSheetProps {
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
  under_review: { bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Eye },
  approved: { bg: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20", icon: CheckCircle },
  rejected: { bg: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  completed: { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  cancelled: { bg: "bg-muted text-muted-foreground border-muted", icon: XCircle },
};

interface RequestWithRequester {
  advance_amount: number | null;
  advance_reason: string | null;
  assigned_team: string | null;
  assigned_to: string | null;
  created_at: string;
  description: string | null;
  escalated: boolean | null;
  escalation_level: number | null;
  hardware_description: string | null;
  hardware_type: string | null;
  id: string;
  leave_end_date: string | null;
  leave_start_date: string | null;
  leave_type: string | null;
  priority: string;
  request_number: string;
  resolved_at: string | null;
  reviewed_at: string | null;
  sla_deadline: string | null;
  sla_hours: number;
  status: string;
  submitted_at: string;
  title: string;
  type: string;
  updated_at: string;
  user_id: string;
  wfh_date: string | null;
  wfh_reason: string | null;
  requester: {
    user_id: string;
    full_name: string | null;
    email: string | null;
    department: string | null;
    job_title: string | null;
  } | null;
}

export function RequestApprovalSheet({ requestId, onClose }: RequestApprovalSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [approvalNotes, setApprovalNotes] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isMarkingReview, setIsMarkingReview] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  const { data: request, isLoading } = useQuery<RequestWithRequester | null>({
    queryKey: ["employee-request-approval", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
      if (error) throw error;

      // Fetch requester profile
      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, department, job_title")
          .eq("user_id", data.user_id)
          .maybeSingle();
        
        return { ...data, requester: profile } as RequestWithRequester;
      }
      return null;
    },
    enabled: !!requestId,
  });

  const { data: comments } = useQuery({
    queryKey: ["request-comments-approval", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_comments")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      
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
    queryKey: ["request-history-approval", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_history")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
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

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["all-employee-requests"] });
    queryClient.invalidateQueries({ queryKey: ["employee-request-approval", requestId] });
    queryClient.invalidateQueries({ queryKey: ["request-history-approval", requestId] });
    queryClient.invalidateQueries({ queryKey: ["request-approval-stats"] });
    queryClient.invalidateQueries({ queryKey: ["employee-requests"] });
  };

  const handleMarkUnderReview = async () => {
    if (!requestId || !user?.id) return;

    setIsMarkingReview(true);
    try {
      const { error } = await supabase
        .from("employee_requests")
        .update({ 
          status: "under_review",
          assigned_to: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      await supabase.from("request_history").insert([{
        request_id: requestId,
        user_id: user.id,
        action: "marked as under review",
        old_status: request?.status as "pending" | "under_review" | "approved" | "rejected" | "completed" | "cancelled" | undefined,
        new_status: "under_review" as const,
      }]);

      // Trigger workflow notification
      workflows.requestUnderReview(requestId);

      invalidateQueries();
      toast.success("Request marked as under review");
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    } finally {
      setIsMarkingReview(false);
    }
  };

  const handleApprove = async () => {
    if (!requestId || !user?.id) return;

    setIsApproving(true);
    try {
      const { error } = await supabase
        .from("employee_requests")
        .update({ 
          status: "approved",
          assigned_to: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      await supabase.from("request_history").insert([{
        request_id: requestId,
        user_id: user.id,
        action: "approved",
        old_status: request?.status as "pending" | "under_review" | "approved" | "rejected" | "completed" | "cancelled" | undefined,
        new_status: "approved" as const,
        notes: approvalNotes.trim() || null,
      }]);

      if (approvalNotes.trim()) {
        await supabase.from("request_comments").insert([{
          request_id: requestId,
          user_id: user.id,
          comment: `Approval Note: ${approvalNotes.trim()}`,
          is_internal: false,
        }]);
      }

      // Trigger workflow notification
      workflows.requestApproved(requestId);

      invalidateQueries();
      setApprovalNotes("");
      toast.success("Request approved successfully!");
      onClose();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!requestId || !user?.id || !approvalNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsRejecting(true);
    try {
      const { error } = await supabase
        .from("employee_requests")
        .update({ 
          status: "rejected",
          assigned_to: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      await supabase.from("request_history").insert([{
        request_id: requestId,
        user_id: user.id,
        action: "rejected",
        old_status: request?.status as "pending" | "under_review" | "approved" | "rejected" | "completed" | "cancelled" | undefined,
        new_status: "rejected" as const,
        notes: approvalNotes.trim(),
      }]);

      await supabase.from("request_comments").insert([{
        request_id: requestId,
        user_id: user.id,
        comment: `Rejection Reason: ${approvalNotes.trim()}`,
        is_internal: false,
      }]);

      // Trigger workflow notification
      workflows.requestRejected(requestId, approvalNotes.trim());

      invalidateQueries();
      setApprovalNotes("");
      toast.success("Request rejected");
      onClose();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleEscalate = async () => {
    if (!requestId || !user?.id) return;

    setIsEscalating(true);
    try {
      const newLevel = (request?.escalation_level || 0) + 1;

      const { error } = await supabase
        .from("employee_requests")
        .update({ 
          escalated: true,
          escalation_level: newLevel
        })
        .eq("id", requestId);

      if (error) throw error;

      await supabase.from("request_history").insert([{
        request_id: requestId,
        user_id: user.id,
        action: `escalated to level ${newLevel}`,
        old_status: request?.status as "pending" | "under_review" | "approved" | "rejected" | "completed" | "cancelled" | undefined,
        new_status: request?.status as "pending" | "under_review" | "approved" | "rejected" | "completed" | "cancelled" | undefined,
        notes: `Request escalated for faster resolution`,
      }]);

      // Trigger workflow notification
      workflows.requestEscalated(requestId);

      invalidateQueries();
      toast.success(`Request escalated to level ${newLevel}`);
    } catch (error) {
      console.error("Error escalating request:", error);
      toast.error("Failed to escalate request");
    } finally {
      setIsEscalating(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !requestId || !user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("request_comments").insert([{
        request_id: requestId,
        user_id: user.id,
        comment: newComment.trim(),
        is_internal: false,
      }]);

      if (error) throw error;

      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["request-comments-approval", requestId] });
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!requestId) return null;

  const Icon = request ? REQUEST_TYPE_ICONS[request.type] : HelpCircle;
  const statusStyle = request ? STATUS_STYLES[request.status] : STATUS_STYLES.pending;
  const StatusIcon = statusStyle.icon;
  const isOverdue = request?.sla_deadline && isPast(new Date(request.sla_deadline)) 
    && !["approved", "rejected", "completed", "cancelled"].includes(request?.status || "");
  const canProcess = request?.status === "pending" || request?.status === "under_review";

  return (
    <Sheet open={!!requestId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Review Request</SheetTitle>
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

              {/* Requester Info */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium mb-2">Requester</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{request.requester?.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{request.requester?.email}</p>
                    {request.requester?.department && (
                      <p className="text-xs text-muted-foreground">
                        {request.requester.job_title} • {request.requester.department}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SLA Warning */}
              {isOverdue && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">SLA Breached - Immediate action required</span>
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
                  <div className="grid grid-cols-3 gap-2 text-sm">
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
                    <p className="text-muted-foreground">Amount Requested</p>
                    <p className="font-semibold text-lg">₹{Number(request.advance_amount).toLocaleString()}</p>
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

              {request.description && (
                <div>
                  <p className="text-sm font-medium mb-2">Additional Details</p>
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                </div>
              )}

              <Separator />

              {/* Approval Actions */}
              {canProcess && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium">Take Action</p>
                  
                  <div className="space-y-2">
                    <Label>Notes (required for rejection)</Label>
                    <Textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add approval notes or rejection reason..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    {request.status === "pending" && (
                      <Button
                        variant="outline"
                        onClick={handleMarkUnderReview}
                        disabled={isMarkingReview}
                        className="flex-1"
                      >
                        {isMarkingReview && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Eye className="w-4 h-4 mr-2" />
                        Mark Under Review
                      </Button>
                    )}
                    <Button
                      variant="default"
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isApproving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isRejecting || !approvalNotes.trim()}
                      className="flex-1"
                    >
                      {isRejecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>

                  {/* Escalate Button */}
                  <Button
                    variant="outline"
                    onClick={handleEscalate}
                    disabled={isEscalating}
                    className="w-full border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                  >
                    {isEscalating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Escalate Request {request.escalation_level ? `(Level ${request.escalation_level})` : ""}
                  </Button>
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
                              <> → <Badge variant="outline" className="text-xs">{item.new_status}</Badge></>
                            )}
                          </p>
                          {item.notes && (
                            <p className="text-muted-foreground mt-0.5">{item.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
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
