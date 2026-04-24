import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { EditTaskDialog } from "../EditTaskDialog";

interface ProjectPlanOverviewProps {
  project: any;
  phases: any[];
  tasks: any[];
  stakeholders: any[];
}

export function ProjectPlanOverview({ project, phases, tasks, stakeholders }: ProjectPlanOverviewProps) {
  const queryClient = useQueryClient();
  const [editingTask, setEditingTask] = useState<any>(null);

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "completed" ? "todo" : "completed";
      const { error } = await supabase
        .from("project_tasks")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects-stats"] });
    },
    onError: (error) => {
      toast.error("Failed to update task: " + error.message);
    },
  });

  const getPhaseProgress = (phaseId: string) => {
    const phaseTasks = tasks.filter(t => t.phase_id === phaseId);
    if (phaseTasks.length === 0) return 0;
    const completed = phaseTasks.filter(t => t.status === "completed").length;
    return Math.round((completed / phaseTasks.length) * 100);
  };

  const getPhaseTaskCounts = (phaseId: string) => {
    const phaseTasks = tasks.filter(t => t.phase_id === phaseId);
    return {
      total: phaseTasks.length,
      completed: phaseTasks.filter(t => t.status === "completed").length,
    };
  };

  const getPhaseDeliverables = (phaseNumber: number) => {
    const deliverables = project.deliverables || [];
    return deliverables.filter((d: any) => d.phase === phaseNumber);
  };

  const getAssigneeName = (userId: string) => {
    const stakeholder = stakeholders.find(s => s.user_id === userId);
    return stakeholder?.name || "Unassigned";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "in_progress": return "text-blue-600";
      case "pending": return "text-yellow-600";
      default: return "text-muted-foreground";
    }
  };

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    toggleTaskMutation.mutate({ taskId, currentStatus });
  };

  const renderTaskItem = (task: any) => (
    <div key={task.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent/50 transition-colors group">
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => handleToggleTask(task.id, task.status)}
      />
      <div
        className="flex-1 cursor-pointer"
        onClick={() => setEditingTask(task)}
      >
        <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground">{task.task_number}</p>
      </div>
      <Badge variant="outline" className="text-xs">
        {getAssigneeName(task.assigned_to)}
      </Badge>
      {(task.priority === "high" || task.priority === "critical") && (
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      )}
    </div>
  );

  // If no phases exist, show tasks by general structure
  if (phases.length === 0) {
    return (
      <div className="space-y-4">
        {project.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Project Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Scope */}
        <div className="grid grid-cols-2 gap-4">
          {project.scope_inclusions && (project.scope_inclusions as string[]).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-600">Scope Inclusions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {(project.scope_inclusions as string[]).map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {project.scope_exclusions && (project.scope_exclusions as string[]).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-red-600">Scope Exclusions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {(project.scope_exclusions as string[]).map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-red-600">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tasks List */}
        {tasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks.slice(0, 10).map(renderTaskItem)}
                {tasks.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {tasks.length - 10} more tasks
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>No phases or tasks created yet</p>
            <p className="text-sm">Use "Enrich with AI" to generate a project plan</p>
          </div>
        )}

        <EditTaskDialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={editingTask}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {project.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Project Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Phases */}
      {phases.map((phase) => {
        const phaseProgress = getPhaseProgress(phase.id);
        const taskCounts = getPhaseTaskCounts(phase.id);
        const phaseDeliverables = getPhaseDeliverables(phase.phase_number);
        const phaseTasks = tasks.filter(t => t.phase_id === phase.id);

        return (
          <Card key={phase.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {phase.phase_number}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Duration: {phase.duration_weeks ? `${phase.duration_weeks} weeks` : "TBD"}
                      {phase.estimated_hours && ` (${phase.estimated_hours} hours)`}
                      {taskCounts.total > 0 && ` • ${taskCounts.total} tasks`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(phase.status)}
                  >
                    {phase.status.charAt(0).toUpperCase() + phase.status.slice(1).replace("_", " ")}
                  </Badge>
                  <span className="text-sm font-medium">{phaseProgress}%</span>
                </div>
              </div>
              <Progress value={phaseProgress} className="mt-2 h-2" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {/* Tasks */}
              <div>
                <h4 className="text-sm font-medium mb-2">
                  TASKS ({taskCounts.completed}/{taskCounts.total} COMPLETED)
                </h4>
                <div className="space-y-2">
                  {phaseTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm hover:bg-accent/50 rounded p-1 transition-colors">
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      />
                      <span
                        className={`flex-1 cursor-pointer ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                        onClick={() => setEditingTask(task)}
                      >
                        {task.title}
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {getAssigneeName(task.assigned_to)}
                      </Badge>
                      {(task.priority === "high" || task.priority === "critical") && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  ))}
                  {phaseTasks.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      + {phaseTasks.length - 5} more tasks
                    </p>
                  )}
                  {phaseTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No tasks assigned to this phase</p>
                  )}
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <h4 className="text-sm font-medium mb-2">KEY DELIVERABLES</h4>
                <div className="space-y-2">
                  {phaseDeliverables.map((deliverable: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{deliverable.name}</span>
                    </div>
                  ))}
                  {phaseDeliverables.length === 0 && (
                    <p className="text-xs text-muted-foreground">No deliverables for this phase</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <EditTaskDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask}
      />
    </div>
  );
}
