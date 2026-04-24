import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, UserMinus, Heart } from "lucide-react";

interface NewOnboardingWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewOnboardingWorkflowDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewOnboardingWorkflowDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workflowType, setWorkflowType] = useState<"onboarding" | "offboarding" | "retention">("onboarding");
  const [formData, setFormData] = useState({
    // Onboarding fields
    jobTitle: "",
    department: "",
    location: "",
    employmentType: "full_time",
    salaryRangeMin: "",
    salaryRangeMax: "",
    expectedSalary: "",
    jobDescription: "",
    requirements: "",
    justification: "",
    urgency: "normal",
    expectedStartDate: "",
    priority: "medium",
    // Offboarding/Retention fields
    employeeId: "",
    reason: "",
    lastWorkingDate: "",
    noticePeriodDays: "30",
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-workflow"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department, job_title")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const createWorkflow = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const workflowTitle = workflowType === "onboarding"
        ? `New Hire: ${formData.jobTitle}`
        : workflowType === "offboarding"
        ? `Offboarding: ${employees.find(e => e.user_id === formData.employeeId)?.full_name || "Employee"}`
        : `Retention: ${employees.find(e => e.user_id === formData.employeeId)?.full_name || "Employee"}`;

      const initialStage = workflowType === "onboarding"
        ? "requirement_submitted"
        : "resignation_submitted";

      // Create the main workflow
      const { data: workflow, error: workflowError } = await supabase
        .from("hr_workflows")
        .insert({
          workflow_type: workflowType,
          title: workflowTitle,
          description: workflowType === "onboarding" ? formData.justification : formData.reason,
          status: "active",
          initiated_by: user.id,
          current_stage: initialStage,
          priority: formData.priority as any,
          target_user_id: workflowType !== "onboarding" ? formData.employeeId : null,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create type-specific record
      if (workflowType === "onboarding") {
        const { error: onboardingError } = await supabase
          .from("onboarding_requests")
          .insert({
            workflow_id: workflow.id,
            requesting_manager_id: user.id,
            job_title: formData.jobTitle,
            department: formData.department || null,
            location: formData.location || null,
            employment_type: formData.employmentType,
            salary_range_min: formData.salaryRangeMin ? parseFloat(formData.salaryRangeMin) : null,
            salary_range_max: formData.salaryRangeMax ? parseFloat(formData.salaryRangeMax) : null,
            expected_salary: formData.expectedSalary ? parseFloat(formData.expectedSalary) : null,
            job_description: formData.jobDescription || null,
            requirements: formData.requirements || null,
            justification: formData.justification || null,
            urgency: formData.urgency,
            expected_start_date: formData.expectedStartDate || null,
            reports_to: user.id,
          });

        if (onboardingError) throw onboardingError;
      } else {
        const { error: resignationError } = await supabase
          .from("resignation_requests")
          .insert({
            workflow_id: workflow.id,
            employee_id: formData.employeeId,
            reason: formData.reason || null,
            last_working_date: formData.lastWorkingDate || null,
            notice_period_days: parseInt(formData.noticePeriodDays) || 30,
            retention_attempted: workflowType === "retention",
          });

        if (resignationError) throw resignationError;
      }

      // Create stage history entry
      await supabase.from("workflow_stage_history").insert({
        workflow_id: workflow.id,
        to_stage: initialStage,
        changed_by: user.id,
        notes: "Workflow initiated",
      });

      return workflow;
    },
    onSuccess: () => {
      toast({
        title: "Workflow Created",
        description: "The workflow has been initiated successfully.",
      });
      onSuccess();
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating workflow:", error);
      toast({
        title: "Error",
        description: "Failed to create workflow. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      jobTitle: "",
      department: "",
      location: "",
      employmentType: "full_time",
      salaryRangeMin: "",
      salaryRangeMax: "",
      expectedSalary: "",
      jobDescription: "",
      requirements: "",
      justification: "",
      urgency: "normal",
      expectedStartDate: "",
      priority: "medium",
      employeeId: "",
      reason: "",
      lastWorkingDate: "",
      noticePeriodDays: "30",
    });
    setWorkflowType("onboarding");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWorkflow.mutate();
  };

  const isValid = workflowType === "onboarding"
    ? formData.jobTitle.trim() !== ""
    : formData.employeeId !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
          <DialogDescription>
            Initiate a new HR workflow for onboarding, offboarding, or retention.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={workflowType} onValueChange={(v) => setWorkflowType(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="onboarding" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="offboarding" className="gap-2">
              <UserMinus className="w-4 h-4" />
              Offboarding
            </TabsTrigger>
            <TabsTrigger value="retention" className="gap-2">
              <Heart className="w-4 h-4" />
              Retention
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Priority (common) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="onboarding" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Mumbai, Remote"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(v) => setFormData({ ...formData, employmentType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Salary Min (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={formData.salaryRangeMin}
                    onChange={(e) => setFormData({ ...formData, salaryRangeMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salary Max (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1500000"
                    value={formData.salaryRangeMax}
                    onChange={(e) => setFormData({ ...formData, salaryRangeMax: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Salary (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Budgeted amount"
                    value={formData.expectedSalary}
                    onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(v) => setFormData({ ...formData, urgency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Start Date</Label>
                  <Input
                    type="date"
                    value={formData.expectedStartDate}
                    onChange={(e) => setFormData({ ...formData, expectedStartDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea
                  placeholder="Describe the role responsibilities..."
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Requirements</Label>
                <Textarea
                  placeholder="Skills, experience, qualifications..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Justification</Label>
                <Textarea
                  placeholder="Why is this hire needed?"
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="offboarding" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Select Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.full_name} - {emp.department || "No dept"} ({emp.job_title || "No title"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Last Working Date</Label>
                  <Input
                    type="date"
                    value={formData.lastWorkingDate}
                    onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notice Period (Days)</Label>
                  <Input
                    type="number"
                    value={formData.noticePeriodDays}
                    onChange={(e) => setFormData({ ...formData, noticePeriodDays: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason for Leaving</Label>
                <Textarea
                  placeholder="Reason for resignation/termination..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="retention" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Select Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.full_name} - {emp.department || "No dept"} ({emp.job_title || "No title"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Retention Notes</Label>
                <Textarea
                  placeholder="Why is this employee being considered for retention? What retention strategies to apply?"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                />
              </div>
            </TabsContent>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || createWorkflow.isPending}>
                {createWorkflow.isPending ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
