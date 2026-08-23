import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  ChevronRight,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  getAccountsStagesForType,
  getAccountsStageProgress,
  getNextAccountsStage,
  type AccountsWorkflowStage,
} from "@/lib/accounts-workflow-templates";

interface AccountsWorkflowStageViewProps {
  workflowId: string;
  workflowType: "order_processing" | "payment_collection";
  currentStage: string;
  onStageComplete?: () => void;
}

export function AccountsWorkflowStageView({
  workflowId,
  workflowType,
  currentStage,
  onStageComplete,
}: AccountsWorkflowStageViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<AccountsWorkflowStage | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");

  const stages = getAccountsStagesForType(workflowType);
  const progress = getAccountsStageProgress(currentStage, workflowType);

  // Fetch stage completions
  const { data: stageCompletions = [] } = useQuery({
    queryKey: ["accounts-workflow-stages", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_workflow_stage_completions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("stage_order");

      if (error) throw error;
      return data || [];
    },
  });

  const isStageCompleted = (stageId: string) => {
    return stageCompletions.some(sc => sc.stage_id === stageId && sc.completed_at);
  };

  const isStageCurrent = (stageId: string) => {
    return currentStage === stageId;
  };

  const isStageAccessible = (stageOrder: number) => {
    const currentStageData = stages.find(s => s.id === currentStage);
    if (!currentStageData) return false;
    return stageOrder <= currentStageData.order;
  };

  const completeStage = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedStage) throw new Error("Missing data");

      // Update stage completion
      const { error: stageError } = await supabase
        .from("accounts_workflow_stage_completions")
        .update({
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: completionNotes || null,
          is_current: false,
        })
        .eq("workflow_id", workflowId)
        .eq("stage_id", selectedStage.id);

      if (stageError) throw stageError;

      // Get next stage
      const nextStage = getNextAccountsStage(selectedStage.id, workflowType);

      if (nextStage) {
        // Mark next stage as current
        await supabase
          .from("accounts_workflow_stage_completions")
          .update({ is_current: true })
          .eq("workflow_id", workflowId)
          .eq("stage_id", nextStage.id);

        // Update workflow current stage
        await supabase
          .from("accounts_workflows")
          .update({ current_stage: nextStage.id })
          .eq("id", workflowId);
      } else {
        // This was the last stage - complete the workflow
        const { data: workflow } = await supabase
          .from("accounts_workflows")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", workflowId)
          .select()
          .single();

        // If this was order_processing, auto-create payment_collection workflow
        if (workflowType === "order_processing" && workflow) {
          const paymentStages = getAccountsStagesForType("payment_collection");
          
          const existingMetadata = typeof workflow.metadata === 'object' && workflow.metadata !== null 
            ? workflow.metadata 
            : {};

          const { data: paymentWorkflow, error: paymentError } = await supabase
            .from("accounts_workflows")
            .insert({
              workflow_type: "payment_collection",
              title: workflow.title.replace("Order Processing:", "Payment Collection:"),
              description: "Auto-created payment collection workflow",
              deal_id: workflow.deal_id,
              order_request_id: workflow.order_request_id,
              parent_workflow_id: workflowId,
              status: "active",
              current_stage: paymentStages[0].id,
              priority: "medium",
              initiated_by: user.id,
              started_at: new Date().toISOString(),
              metadata: {
                ...existingMetadata,
                auto_created: true,
                source_workflow_id: workflowId,
              },
            })
            .select()
            .single();

          if (!paymentError && paymentWorkflow) {
            // Initialize payment collection stages
            const stageCompletions = paymentStages.map((stage, index) => ({
              workflow_id: paymentWorkflow.id,
              stage_id: stage.id,
              stage_order: stage.order,
              is_current: index === 0,
              completed_at: null,
              completed_by: null,
            }));

            await supabase
              .from("accounts_workflow_stage_completions")
              .insert(stageCompletions);
          }
        }
      }
    },
    onSuccess: () => {
      const nextStage = getNextAccountsStage(selectedStage!.id, workflowType);
      toast({
        title: nextStage ? "Stage Completed" : "Workflow Completed",
        description: nextStage
          ? `Moving to: ${nextStage.name}`
          : workflowType === "order_processing"
            ? "Payment Collection workflow has been auto-created"
            : "All stages completed",
      });
      queryClient.invalidateQueries({ queryKey: ["accounts-workflow-stages", workflowId] });
      queryClient.invalidateQueries({ queryKey: ["accounts-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-workflow-counts"] });
      setShowCompleteDialog(false);
      setSelectedStage(null);
      setCompletionNotes("");
      onStageComplete?.();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStageStatus = (stage: AccountsWorkflowStage) => {
    if (isStageCompleted(stage.id)) return "completed";
    if (isStageCurrent(stage.id)) return "current";
    if (!isStageAccessible(stage.order)) return "locked";
    return "pending";
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "current":
        return <Circle className="w-5 h-5 text-blue-500 fill-blue-500" />;
      case "locked":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress}% Complete</span>
              <span className="text-muted-foreground">
                {stageCompletions.filter(s => s.completed_at).length} of {stages.length} stages
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Stages List */}
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage);
          const completion = stageCompletions.find(sc => sc.stage_id === stage.id);

          return (
            <Card
              key={stage.id}
              className={cn(
                "transition-all",
                status === "current" && "ring-2 ring-primary",
                status === "locked" && "opacity-50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    {getStageIcon(status)}
                    {index < stages.length - 1 && (
                      <div
                        className={cn(
                          "w-0.5 h-8 mt-2",
                          status === "completed" ? "bg-green-500" : "bg-muted"
                        )}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {stage.name}
                          {status === "current" && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                      </div>

                      {status === "current" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedStage(stage);
                            setShowCompleteDialog(true);
                          }}
                        >
                          Complete
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stage.estimatedDuration || "Variable"}
                      </div>

                      {completion?.completed_at && (
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed {format(new Date(completion.completed_at), "MMM d, yyyy")}
                        </div>
                      )}

                      {stage.requiredApprovers && stage.requiredApprovers.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          Requires: {stage.requiredApprovers.join(", ")}
                        </div>
                      )}
                    </div>

                    {completion?.notes && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        {completion.notes}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Complete Stage Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Stage: {selectedStage?.name}</DialogTitle>
            <DialogDescription>
              {selectedStage?.description}
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

            {getNextAccountsStage(selectedStage?.id || "", workflowType) ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                <span className="font-medium">Next Stage: </span>
                {getNextAccountsStage(selectedStage?.id || "", workflowType)?.name}
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
                <span className="font-medium">This is the final stage. </span>
                {workflowType === "order_processing" && (
                  <span>A Payment Collection workflow will be automatically created.</span>
                )}
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
              {completeStage.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Stage"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
