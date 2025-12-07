import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  UserMinus,
  Heart,
  Clock,
  ChevronRight,
  Zap,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  WORKFLOW_TEMPLATES, 
  getStagesForWorkflowType,
  type WorkflowTemplate 
} from "@/lib/workflow-templates";
import { useQuery } from "@tanstack/react-query";

interface WorkflowTemplateBoardsProps {
  onWorkflowCreated: () => void;
}

export function WorkflowTemplateBoards({ onWorkflowCreated }: WorkflowTemplateBoardsProps) {
  const { user, isAdmin, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: "",
    department: "",
    location: "",
    justification: "",
    employeeId: "",
    employeeName: "",
    reason: "",
    lastWorkingDate: "",
  });

  // Fetch employees for offboarding/retention
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, department, job_title")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const getTemplateIcon = (template: WorkflowTemplate) => {
    if (template.type === "onboarding") {
      return template.id.includes("urgent") ? (
        <Zap className="w-6 h-6 text-yellow-500" />
      ) : (
        <UserPlus className="w-6 h-6 text-green-500" />
      );
    }
    if (template.type === "offboarding") {
      return template.id.includes("immediate") ? (
        <Zap className="w-6 h-6 text-red-500" />
      ) : (
        <UserMinus className="w-6 h-6 text-orange-500" />
      );
    }
    return <Heart className="w-6 h-6 text-pink-500" />;
  };

  const getTemplateColor = (template: WorkflowTemplate) => {
    if (template.type === "onboarding") return "border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5";
    if (template.type === "offboarding") return "border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/5";
    return "border-pink-500/30 hover:border-pink-500/60 hover:bg-pink-500/5";
  };

  const initializeWorkflowStages = async (workflowId: string, type: "onboarding" | "offboarding" | "retention") => {
    const stages = getStagesForWorkflowType(type);
    const stageCompletions = stages.map((stage, index) => ({
      workflow_id: workflowId,
      stage_id: stage.id,
      stage_order: stage.order,
      is_current: index === 0,
      completed_at: null,
      completed_by: null,
    }));

    const { error } = await supabase
      .from("workflow_stage_completions")
      .insert(stageCompletions);

    if (error) throw error;
  };

  const createWorkflow = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedTemplate) throw new Error("Not authenticated");

      const stages = getStagesForWorkflowType(selectedTemplate.type);
      const firstStage = stages[0]?.id || "submitted";

      let title = "";
      let targetUserId: string | null = null;

      if (selectedTemplate.type === "onboarding") {
        title = `Hiring: ${formData.jobTitle}`;
      } else if (selectedTemplate.type === "offboarding") {
        const employee = employees.find(e => e.user_id === formData.employeeId);
        title = `Offboarding: ${employee?.full_name || formData.employeeName}`;
        targetUserId = formData.employeeId || null;
      } else {
        const employee = employees.find(e => e.user_id === formData.employeeId);
        title = `Retention: ${employee?.full_name || formData.employeeName}`;
        targetUserId = formData.employeeId || null;
      }

      // Create the workflow
      const { data: workflow, error: workflowError } = await supabase
        .from("hr_workflows")
        .insert({
          workflow_type: selectedTemplate.type,
          title,
          description: formData.justification || formData.reason,
          status: "active",
          initiated_by: user.id,
          target_user_id: targetUserId,
          current_stage: firstStage,
          priority: selectedTemplate.id.includes("urgent") || selectedTemplate.id.includes("immediate") ? "high" : "medium",
          started_at: new Date().toISOString(),
          source_type: "template_board",
          metadata: {
            template_id: selectedTemplate.id,
            template_name: selectedTemplate.name,
          },
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Initialize stage completions
      await initializeWorkflowStages(workflow.id, selectedTemplate.type);

      // Create related request
      if (selectedTemplate.type === "onboarding") {
        const { error } = await supabase.from("onboarding_requests").insert({
          workflow_id: workflow.id,
          requesting_manager_id: user.id,
          job_title: formData.jobTitle,
          department: formData.department || null,
          location: formData.location || null,
          justification: formData.justification || null,
          reports_to: user.id,
        });
        if (error) throw error;
      } else if (selectedTemplate.type === "offboarding" || selectedTemplate.type === "retention") {
        const { error } = await supabase.from("resignation_requests").insert({
          workflow_id: workflow.id,
          employee_id: formData.employeeId,
          reason: formData.reason || null,
          last_working_date: formData.lastWorkingDate || null,
          notice_period_days: 30,
        });
        if (error) throw error;
      }

      return workflow;
    },
    onSuccess: () => {
      toast({ title: "Workflow Created", description: "The workflow has been initiated successfully." });
      queryClient.invalidateQueries({ queryKey: ["hr-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["hr-workflow-stats"] });
      setShowDialog(false);
      resetForm();
      onWorkflowCreated();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create workflow.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      jobTitle: "",
      department: "",
      location: "",
      justification: "",
      employeeId: "",
      employeeName: "",
      reason: "",
      lastWorkingDate: "",
    });
    setSelectedTemplate(null);
  };

  const handleTemplateClick = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setShowDialog(true);
  };

  const isFormValid = () => {
    if (!selectedTemplate) return false;
    if (selectedTemplate.type === "onboarding") {
      return formData.jobTitle.trim() !== "";
    }
    return formData.employeeId !== "";
  };

  const canManageWorkflows = isAdmin || role === "manager";

  if (!canManageWorkflows) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Quick Start - Workflow Templates
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {WORKFLOW_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer transition-all duration-200 border-2 select-none",
                getTemplateColor(template)
              )}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTemplateClick(template);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTemplateClick(template);
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  {getTemplateIcon(template)}
                  <Badge variant="outline" className="text-xs">
                    {template.stages.length} stages
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                <CardDescription className="text-xs">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {template.estimatedDuration}
                </div>
                <div 
                  className="w-full mt-2 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary hover:text-primary/80"
                >
                  Start Workflow
                  <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && getTemplateIcon(selectedTemplate)}
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedTemplate?.type === "onboarding" && (
              <>
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input
                      placeholder="e.g. Engineering"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g. Mumbai"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Justification</Label>
                  <Textarea
                    placeholder="Why is this hire needed?"
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  />
                </div>
              </>
            )}

            {(selectedTemplate?.type === "offboarding" || selectedTemplate?.type === "retention") && (
              <>
                <div className="space-y-2">
                  <Label>Select Employee *</Label>
                  <Select
                    value={formData.employeeId}
                    onValueChange={(value) => {
                      const emp = employees.find(e => e.user_id === value);
                      setFormData({ 
                        ...formData, 
                        employeeId: value,
                        employeeName: emp?.full_name || ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.user_id} value={emp.user_id}>
                          {emp.full_name} - {emp.department || "No Dept"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder={selectedTemplate?.type === "retention" ? "Why is this employee at risk?" : "Reason for leaving"}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
                {selectedTemplate?.type === "offboarding" && (
                  <div className="space-y-2">
                    <Label>Last Working Date</Label>
                    <Input
                      type="date"
                      value={formData.lastWorkingDate}
                      onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createWorkflow.mutate()}
              disabled={!isFormValid() || createWorkflow.isPending}
            >
              {createWorkflow.isPending ? "Creating..." : "Start Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}