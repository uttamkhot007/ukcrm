import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, ListTodo, Clock, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["projects-stats"],
    queryFn: async () => {
      const [projectsRes, tasksRes, timeRes] = await Promise.all([
        supabase.from("projects").select("status"),
        supabase.from("project_tasks").select("status"),
        supabase.from("project_time_entries").select("hours"),
      ]);

      const projects = projectsRes.data || [];
      const tasks = tasksRes.data || [];
      const timeEntries = timeRes.data || [];

      const totalHours = timeEntries.reduce((sum, t) => sum + Number(t.hours || 0), 0);

      return {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === "active").length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        pendingTasks: tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length,
        totalHours: totalHours,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
          <p className="text-xs text-muted-foreground">
            of {stats?.totalProjects || 0} total projects
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.pendingTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks to complete</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {stats?.completedTasks || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            of {stats?.totalTasks || 0} total tasks
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalHours?.toFixed(1) || 0}</div>
          <p className="text-xs text-muted-foreground">Total hours tracked</p>
        </CardContent>
      </Card>
    </div>
  );
}
