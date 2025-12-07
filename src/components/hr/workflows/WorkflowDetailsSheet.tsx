import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  UserMinus,
  Heart,
  Calendar,
  Clock,
  User,
  ChevronRight,
  MessageSquare,
  History,
  FileText,
  Users,
  Send,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface WorkflowDetailsSheetProps {
  workflowId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const ONBOARDING_STAGES = [
  { id: "requirement_submitted", label: "Requirement Submitted" },
  { id: "hr_sourcing", label: "HR Sourcing" },
  { id: "profile_review", label: "Profile Review" },
  { id: "manager_interview", label: "Manager Interview" },
  { id: "senior_interview", label: "Senior Interview" },
  { id: "ceo_interview", label: "CEO Interview" },
  { id: "management_interview", label: "Management Interview" },
  { id: "offer_preparation", label: "Offer Preparation" },
  { id: "offer_sent", label: "Offer Sent" },
  { id: "offer_accepted", label: "Offer Accepted" },
  { id: "completed", label: "Completed" },
];

const OFFBOARDING_STAGES = [
  { id: "resignation_submitted", label: "Resignation Submitted" },
  { id: "manager_review", label: "Manager Review" },
  { id: "retention_review", label: "Retention Review" },
  { id: "exit_approved", label: "Exit Approved" },
  { id: "knowledge_transfer", label: "Knowledge Transfer" },
  { id: "asset_return", label: "Asset Return" },
  { id: "exit_interview", label: "Exit Interview" },
  { id: "final_settlement", label: "Final Settlement" },
  { id: "completed", label: "Completed" },
];

export function WorkflowDetailsSheet({
  workflowId,
  open,
  onOpenChange,
  onUpdate,
}: WorkflowDetailsSheetProps) {
  const { user, isAdmin, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow-details", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const { data, error } = await supabase
        .from("hr_workflows")
        .select(`
          *,
          onboarding_requests(*),
          resignation_requests(*)
        `)
        .eq("id", workflowId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workflowId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["workflow-history", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from("workflow_stage_history")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workflowId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["workflow-comments", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from("workflow_comments")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workflowId,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["workflow-candidates", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from("workflow_candidates")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workflowId,
  });

  const advanceStage = useMutation({
    mutationFn: async (nextStage: string) => {
      if (!workflowId || !user?.id) return;
      
      const { error: updateError } = await supabase
        .from("hr_workflows")
        .update({ 
          current_stage: nextStage,
          status: nextStage === "completed" ? "completed" : "active",
          completed_at: nextStage === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;

      await supabase.from("workflow_stage_history").insert({
        workflow_id: workflowId,
        from_stage: workflow?.current_stage,
        to_stage: nextStage,
        changed_by: user.id,
      });
    },
    onSuccess: () => {
      toast({ title: "Stage Updated", description: "Workflow stage has been advanced." });
      queryClient.invalidateQueries({ queryKey: ["workflow-details", workflowId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-history", workflowId] });
      onUpdate();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update stage.", variant: "destructive" });
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!workflowId || !user?.id || !comment.trim()) return;
      
      const { error } = await supabase
        .from("workflow_comments")
        .insert({
          workflow_id: workflowId,
          user_id: user.id,
          comment: comment.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["workflow-comments", workflowId] });
      toast({ title: "Comment Added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
    },
  });

  if (!workflow) {
    return null;
  }

  const stages = workflow.workflow_type === "onboarding" ? ONBOARDING_STAGES : OFFBOARDING_STAGES;
  const currentStageIndex = stages.findIndex((s) => s.id === workflow.current_stage);
  const nextStage = stages[currentStageIndex + 1];
  const progress = Math.round(((currentStageIndex + 1) / stages.length) * 100);

  const getWorkflowIcon = () => {
    switch (workflow.workflow_type) {
      case "onboarding":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case "offboarding":
        return <UserMinus className="w-5 h-5 text-red-500" />;
      case "retention":
        return <Heart className="w-5 h-5 text-pink-500" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const canAdvance = isAdmin || role === "manager";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            {getWorkflowIcon()}
            <div>
              <SheetTitle>{workflow.title}</SheetTitle>
              <SheetDescription className="capitalize">
                {workflow.workflow_type} Workflow
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Progress */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      workflow.status === "active" && "border-blue-500 text-blue-500",
                      workflow.status === "pending_approval" && "border-yellow-500 text-yellow-500",
                      workflow.status === "completed" && "border-green-500 text-green-500"
                    )}
                  >
                    {workflow.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="secondary">{workflow.priority}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(workflow.created_at), "MMM d, yyyy")}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Current: {stages.find((s) => s.id === workflow.current_stage)?.label}
                  </span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {canAdvance && nextStage && workflow.status !== "completed" && (
                <Button
                  className="w-full gap-2"
                  onClick={() => advanceStage.mutate(nextStage.id)}
                  disabled={advanceStage.isPending}
                >
                  <ArrowRight className="w-4 h-4" />
                  Advance to: {nextStage.label}
                </Button>
              )}

              {workflow.status === "completed" && (
                <div className="flex items-center justify-center gap-2 text-green-500 py-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Workflow Completed</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Stage Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {stages.map((stage, index) => {
                    const isCompleted = index < currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    return (
                      <div
                        key={stage.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg",
                          isCompleted && "bg-green-500/10",
                          isCurrent && "bg-primary/10 border border-primary/20"
                        )}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                            isCompleted && "bg-green-500 text-white",
                            isCurrent && "bg-primary text-primary-foreground",
                            !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                        </div>
                        <span
                          className={cn(
                            "text-sm",
                            (isCompleted || isCurrent) && "font-medium"
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tabs for Details, Comments, History */}
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="gap-2">
                <FileText className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {workflow.onboarding_requests?.[0] && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Hiring Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Job Title:</span>
                        <p className="font-medium">{workflow.onboarding_requests[0].job_title}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Department:</span>
                        <p className="font-medium">{workflow.onboarding_requests[0].department || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <p className="font-medium">{workflow.onboarding_requests[0].location || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Employment Type:</span>
                        <p className="font-medium capitalize">
                          {workflow.onboarding_requests[0].employment_type?.replace(/_/g, " ") || "-"}
                        </p>
                      </div>
                      {workflow.onboarding_requests[0].expected_salary && (
                        <div>
                          <span className="text-muted-foreground">Expected Salary:</span>
                          <p className="font-medium">
                            ₹{workflow.onboarding_requests[0].expected_salary.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {workflow.onboarding_requests[0].expected_start_date && (
                        <div>
                          <span className="text-muted-foreground">Expected Start:</span>
                          <p className="font-medium">
                            {format(new Date(workflow.onboarding_requests[0].expected_start_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      )}
                    </div>
                    {workflow.onboarding_requests[0].job_description && (
                      <div>
                        <span className="text-muted-foreground">Description:</span>
                        <p className="mt-1">{workflow.onboarding_requests[0].job_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {workflow.resignation_requests?.[0] && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {workflow.workflow_type === "retention" ? "Retention" : "Resignation"} Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {workflow.resignation_requests[0].last_working_date && (
                      <div>
                        <span className="text-muted-foreground">Last Working Date:</span>
                        <p className="font-medium">
                          {format(new Date(workflow.resignation_requests[0].last_working_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Notice Period:</span>
                      <p className="font-medium">
                        {workflow.resignation_requests[0].notice_period_days} days
                      </p>
                    </div>
                    {workflow.resignation_requests[0].reason && (
                      <div>
                        <span className="text-muted-foreground">Reason:</span>
                        <p className="mt-1">{workflow.resignation_requests[0].reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {candidates.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Candidates ({candidates.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{candidate.candidate_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.current_company} • {candidate.experience_years} yrs exp
                            </p>
                          </div>
                          <Badge variant={candidate.selected ? "default" : "secondary"}>
                            {candidate.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button
                  size="icon"
                  onClick={() => addComment.mutate()}
                  disabled={!comment.trim() || addComment.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{c.comment}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      No comments yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 p-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {h.from_stage ? (
                            <>
                              <span className="text-muted-foreground">
                                {h.from_stage.replace(/_/g, " ")}
                              </span>
                              {" → "}
                              <span className="font-medium">
                                {h.to_stage.replace(/_/g, " ")}
                              </span>
                            </>
                          ) : (
                            <span className="font-medium">
                              Started at {h.to_stage.replace(/_/g, " ")}
                            </span>
                          )}
                        </p>
                        {h.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(h.created_at), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
