import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { NewTaskDialog } from "./NewTaskDialog";

export function ProjectTasksView() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["my-tasks", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("project_tasks")
        .select(`
          *,
          project:projects(name, project_number)
        `)
        .eq("assigned_to", user?.id)
        .order("due_date", { ascending: true });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,task_number.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      todo: { label: "To Do", variant: "outline" },
      in_progress: { label: "In Progress", variant: "secondary" },
      review: { label: "In Review", variant: "secondary" },
      completed: { label: "Completed", variant: "default" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: "Low", className: "bg-slate-100 text-slate-700" },
      medium: { label: "Medium", className: "bg-blue-100 text-blue-700" },
      high: { label: "High", className: "bg-amber-100 text-amber-700" },
      critical: { label: "Critical", className: "bg-red-100 text-red-700" },
    };
    const config = priorityConfig[priority] || { label: priority, className: "" };
    return <Badge className={config.className} variant="outline">{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Est. Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading tasks...
                </TableCell>
              </TableRow>
            ) : tasks?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <ListTodo className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No tasks assigned to you</p>
                </TableCell>
              </TableRow>
            ) : (
              tasks?.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {task.task_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{task.project?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {task.project?.project_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>{getPriorityBadge(task.priority || "medium")}</TableCell>
                  <TableCell>
                    {task.due_date
                      ? format(new Date(task.due_date), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {task.estimated_hours || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewTaskDialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen} />
    </div>
  );
}
