import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  Lock,
  ArrowRight,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  getStagesForWorkflowType, 
  getStageProgress,
  type WorkflowStage 
} from "@/lib/workflow-templates";

interface WorkflowStageViewProps {
  workflow: any;
  onStageComplete: () => void;
}

export function WorkflowStageView({ workflow, onStageComplete }: WorkflowStageViewProps) {
  const { user, isAdmin, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);

  const stages = getStagesForWorkflowType(workflow.workflow_type);
  const currentStageIndex = stages.findIndex(s => s.id === workflow.current_stage);
  const progress = getStageProgress(workflow.current_stage, workflow.workflow_type);

  // Fetch stage completions
  const { data: stageCompletions = [] } = useQuery({
    queryKey: ["stage-completions", workflow.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_stage_completions")
        .select("*")
        .eq("workflow_id", workflow.id)
        .order("stage_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for completed_by names
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unknown";
    return profiles.find(p => p.user_id === userId)?.full_name || "Unknown";
  };

  const getStageStatus = (stage: WorkflowStage, index: number) => {
    if (index < currentStageIndex) return "completed";
    if (index === currentStageIndex) return "current";
    return "locked";
  };

  const completeStage = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedStage) throw new Error("Invalid operation");

      // Verify this is the current stage (prevent bypassing)
      if (selectedStage.id !== workflow.current_stage) {
        throw new Error("You can only complete the current stage");
      }

      const nextStage = stages[currentStageIndex + 1];
      const isLastStage = !nextStage || nextStage.id === "completed";

      // Update the stage completion record
      const { error: completionError } = await supabase
        .from("workflow_stage_completions")
        .update({
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: completionNotes || null,
          is_current: false,
        })
        .eq("workflow_id", workflow.id)
        .eq("stage_id", selectedStage.id);

      if (completionError) throw completionError;

      // Mark next stage as current (if exists)
      if (nextStage) {
        const { error: nextError } = await supabase
          .from("workflow_stage_completions")
          .update({ is_current: true })
          .eq("workflow_id", workflow.id)
          .eq("stage_id", nextStage.id);

        if (nextError) throw nextError;
      }

      // Update the workflow
      const { error: workflowError } = await supabase
        .from("hr_workflows")
        .update({
          current_stage: nextStage?.id || "completed",
          status: isLastStage ? "completed" : "active",
          completed_at: isLastStage ? new Date().toISOString() : null,
        })
        .eq("id", workflow.id);

      if (workflowError) throw workflowError;

      // Log to history
      await supabase.from("workflow_stage_history").insert({
        workflow_id: workflow.id,
        from_stage: selectedStage.id,
        to_stage: nextStage?.id || "completed",
        changed_by: user.id,
        notes: completionNotes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Stage Completed", description: "Moving to the next stage." });
      queryClient.invalidateQueries({ queryKey: ["workflow-details", workflow.id] });
      queryClient.invalidateQueries({ queryKey: ["stage-completions", workflow.id] });
      queryClient.invalidateQueries({ queryKey: ["hr-workflows"] });
      setShowCompleteDialog(false);
      setCompletionNotes("");
      setSelectedStage(null);
      onStageComplete();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to complete stage.", 
        variant: "destructive" 
      });
    },
  });

  const handleCompleteClick = (stage: WorkflowStage) => {
    setSelectedStage(stage);
    setShowCompleteDialog(true);
  };

  const canManage = isAdmin || role === "manager";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Workflow Stages</CardTitle>
          <Badge variant="outline">{progress}% Complete</Badge>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-1">
            {stages.map((stage, index) => {
              const status = getStageStatus(stage, index);
              const completion = stageCompletions.find(c => c.stage_id === stage.id);
              const isCompleted = status === "completed";
              const isCurrent = status === "current";
              const isLocked = status === "locked";

              return (
                <div key={stage.id}>
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg transition-all",
                      isCompleted && "bg-green-500/10",
                      isCurrent && "bg-primary/10 border border-primary/30",
                      isLocked && "opacity-50"
                    )}
                  >
                    {/* Stage Indicator */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          isCompleted && "bg-green-500 text-white",
                          isCurrent && "bg-primary text-primary-foreground",
                          isLocked && "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < stages.length - 1 && (
                        <div 
                          className={cn(
                            "w-0.5 h-8 mt-1",
                            isCompleted ? "bg-green-500" : "bg-border"
                          )} 
                        />
                      )}
                    </div>

                    {/* Stage Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={cn(
                          "font-medium",
                          isLocked && "text-muted-foreground"
                        )}>
                          {stage.name}
                        </h4>
                        {isCurrent && (
                          <Badge className="bg-primary/20 text-primary border-0">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "text-sm mt-0.5",
                        isLocked ? "text-muted-foreground/60" : "text-muted-foreground"
                      )}>
                        {stage.description}
                      </p>

                      {/* Completion Info */}
                      {isCompleted && completion?.completed_at && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {getProfileName(completion.completed_by)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(completion.completed_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      )}

                      {/* Required Approvers */}
                      {stage.requiredApprovers && stage.requiredApprovers.length > 0 && !isCompleted && (
                        <div className="flex items-center gap-1 mt-2">
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-muted-foreground">
                            Requires: {stage.requiredApprovers.join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Estimated Days */}
                      {stage.estimatedDays && !isCompleted && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Est. {stage.estimatedDays} day{stage.estimatedDays > 1 ? "s" : ""}
                        </div>
                      )}

                      {/* Complete Button for Current Stage */}
                      {isCurrent && canManage && workflow.status !== "completed" && (
                        <Button
                          size="sm"
                          className="mt-3 gap-2"
                          onClick={() => handleCompleteClick(stage)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Complete Stage
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {index < stages.length - 1 && <Separator className="my-0" />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Complete Stage Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Stage: {selectedStage?.name}</DialogTitle>
            <DialogDescription>
              Confirm completion of this stage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Completion Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes about this stage completion..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </div>
            {selectedStage?.requiredApprovers && selectedStage.requiredApprovers.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">
                  This stage requires approval from: {selectedStage.requiredApprovers.join(", ")}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => completeStage.mutate()}
              disabled={completeStage.isPending}
            >
              {completeStage.isPending ? "Completing..." : "Complete & Move Forward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}