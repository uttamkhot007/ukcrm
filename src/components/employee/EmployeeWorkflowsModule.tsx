import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  UserMinus,
  GitBranch,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  Calendar,
} from "lucide-react";

export function EmployeeWorkflowsModule() {
  const { user, role, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewHireDialog, setShowNewHireDialog] = useState(false);
  const [showResignationDialog, setShowResignationDialog] = useState(false);
  const [formData, setFormData] = useState({
    // New hire request
    jobTitle: "",
    department: "",
    justification: "",
    // Resignation
    reason: "",
    lastWorkingDate: "",
  });

  const isManager = role === "manager" || isAdmin;

  // Fetch workflows initiated by or involving the current user
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["my-workflows", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("hr_workflows")
        .select("*, onboarding_requests(*), resignation_requests(*)")
        .or(`initiated_by.eq.${user.id},target_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const initiatedByMe = workflows.filter((w) => w.initiated_by === user?.id);
  const involvingMe = workflows.filter((w) => w.target_user_id === user?.id);

  // Create new hire request (for managers)
  const createNewHireRequest = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: workflow, error: workflowError } = await supabase
        .from("hr_workflows")
        .insert({
          workflow_type: "onboarding",
          title: `New Hire Request: ${formData.jobTitle}`,
          description: formData.justification,
          status: "active",
          initiated_by: user.id,
          current_stage: "requirement_submitted",
          priority: "medium",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      const { error: requestError } = await supabase
        .from("onboarding_requests")
        .insert({
          workflow_id: workflow.id,
          requesting_manager_id: user.id,
          job_title: formData.jobTitle,
          department: formData.department || null,
          justification: formData.justification || null,
          reports_to: user.id,
        });

      if (requestError) throw requestError;

      await supabase.from("workflow_stage_history").insert({
        workflow_id: workflow.id,
        to_stage: "requirement_submitted",
        changed_by: user.id,
        notes: "New hire request submitted by manager",
      });

      return workflow;
    },
    onSuccess: () => {
      toast({ title: "Request Submitted", description: "Your new hire request has been submitted to HR." });
      queryClient.invalidateQueries({ queryKey: ["my-workflows"] });
      setShowNewHireDialog(false);
      setFormData({ jobTitle: "", department: "", justification: "", reason: "", lastWorkingDate: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
    },
  });

  // Create resignation request (for any employee)
  const createResignation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: workflow, error: workflowError } = await supabase
        .from("hr_workflows")
        .insert({
          workflow_type: "offboarding",
          title: `Resignation: ${user.email}`,
          description: formData.reason,
          status: "active",
          initiated_by: user.id,
          target_user_id: user.id,
          current_stage: "resignation_submitted",
          priority: "medium",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      const { error: resignationError } = await supabase
        .from("resignation_requests")
        .insert({
          workflow_id: workflow.id,
          employee_id: user.id,
          reason: formData.reason || null,
          last_working_date: formData.lastWorkingDate || null,
          notice_period_days: 30,
        });

      if (resignationError) throw resignationError;

      await supabase.from("workflow_stage_history").insert({
        workflow_id: workflow.id,
        to_stage: "resignation_submitted",
        changed_by: user.id,
        notes: "Resignation submitted",
      });

      return workflow;
    },
    onSuccess: () => {
      toast({ title: "Resignation Submitted", description: "Your resignation has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: ["my-workflows"] });
      setShowResignationDialog(false);
      setFormData({ jobTitle: "", department: "", justification: "", reason: "", lastWorkingDate: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit resignation.", variant: "destructive" });
    },
  });

  const getWorkflowProgress = (workflow: any) => {
    const stages = workflow.workflow_type === "onboarding"
      ? ["requirement_submitted", "hr_sourcing", "profile_review", "manager_interview", "senior_interview", "ceo_interview", "management_interview", "offer_preparation", "offer_sent", "offer_accepted", "completed"]
      : ["resignation_submitted", "manager_review", "retention_review", "exit_approved", "knowledge_transfer", "asset_return", "exit_interview", "final_settlement", "completed"];
    
    const currentIndex = stages.indexOf(workflow.current_stage);
    return Math.round(((currentIndex + 1) / stages.length) * 100);
  };

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Workflows</h1>
            <p className="text-muted-foreground">Initiate and track HR workflows</p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isManager && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowNewHireDialog(true)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-500" />
                Request New Hire
              </CardTitle>
              <CardDescription>
                Submit a new hire request to HR for approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Initiate Onboarding Workflow
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowResignationDialog(true)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-500" />
              Submit Resignation
            </CardTitle>
            <CardDescription>
              Initiate your resignation process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Start Offboarding Workflow
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* My Workflows */}
      <Tabs defaultValue="initiated">
        <TabsList>
          <TabsTrigger value="initiated" className="gap-2">
            Initiated by Me ({initiatedByMe.length})
          </TabsTrigger>
          <TabsTrigger value="involving" className="gap-2">
            Involving Me ({involvingMe.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="initiated" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : initiatedByMe.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                You haven't initiated any workflows yet.
              </CardContent>
            </Card>
          ) : (
            initiatedByMe.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {workflow.workflow_type === "onboarding" ? (
                        <UserPlus className="w-5 h-5 text-green-500" />
                      ) : (
                        <UserMinus className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{workflow.title}</h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            workflow.status === "active" && "border-blue-500 text-blue-500",
                            workflow.status === "completed" && "border-green-500 text-green-500"
                          )}
                        >
                          {workflow.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{workflow.workflow_type}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatStage(workflow.current_stage)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(workflow.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={getWorkflowProgress(workflow)} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {getWorkflowProgress(workflow)}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="involving" className="space-y-4 mt-4">
          {involvingMe.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No workflows currently involve you.
              </CardContent>
            </Card>
          ) : (
            involvingMe.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {workflow.workflow_type === "onboarding" ? (
                        <UserPlus className="w-5 h-5 text-green-500" />
                      ) : workflow.workflow_type === "retention" ? (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <UserMinus className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{workflow.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{workflow.workflow_type}</span>
                        <span>Stage: {formatStage(workflow.current_stage)}</span>
                      </div>
                    </div>
                    <Badge variant={workflow.status === "completed" ? "default" : "secondary"}>
                      {workflow.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* New Hire Dialog */}
      <Dialog open={showNewHireDialog} onOpenChange={setShowNewHireDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-500" />
              Request New Hire
            </DialogTitle>
            <DialogDescription>
              Submit a new hire requirement to HR. This will initiate the onboarding workflow.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createNewHireRequest.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                placeholder="e.g. Senior Software Engineer"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                placeholder="e.g. Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Justification</Label>
              <Textarea
                placeholder="Why is this hire needed?"
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNewHireDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.jobTitle.trim() || createNewHireRequest.isPending}>
                {createNewHireRequest.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resignation Dialog */}
      <Dialog open={showResignationDialog} onOpenChange={setShowResignationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-500" />
              Submit Resignation
            </DialogTitle>
            <DialogDescription>
              This will initiate the offboarding workflow. Your manager will be notified for review.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createResignation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Last Working Date</Label>
              <Input
                type="date"
                value={formData.lastWorkingDate}
                onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Resignation</Label>
              <Textarea
                placeholder="Please share your reason for leaving (optional but helpful)..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowResignationDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={createResignation.isPending}>
                {createResignation.isPending ? "Submitting..." : "Submit Resignation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
