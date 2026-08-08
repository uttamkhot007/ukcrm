import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Task {
  id: string;
  title: string;
  dueTime: string;
  priority: "high" | "medium" | "low";
  category: string;
}

const priorityColors = {
  high: "text-destructive bg-destructive/10",
  medium: "text-support bg-support/10",
  low: "text-muted-foreground bg-muted",
};

function normalizePriority(value: string | null): Task["priority"] {
  if (value === "high" || value === "critical" || value === "urgent") return "high";
  if (value === "low") return "low";
  return "medium";
}

function formatDue(dueDate: string | null): string {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

interface UpcomingTasksProps {
  onNavigate?: (module: string) => void;
}

export function UpcomingTasks({ onNavigate }: UpcomingTasksProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.id) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, title, due_date, priority, status")
        .eq("assigned_to", user.id)
        .neq("status", "completed")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(6);

      if (cancelled) return;
      if (error) {
        setTasks([]);
      } else {
        setTasks(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            dueTime: formatDue(row.due_date),
            priority: normalizePriority(row.priority),
            category: row.status ?? "open",
          }))
        );
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">My Tasks</h3>
        <span className="text-sm text-muted-foreground">
          {loading ? "…" : `${tasks.length} tasks`}
        </span>
      </div>

      {!loading && tasks.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No open tasks assigned to you.
        </p>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
            onClick={() => onNavigate?.("projects")}
          >
            <button className="mt-0.5 text-muted-foreground hover:text-primary transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {task.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{task.category}</span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {task.dueTime}
                </span>
              </div>
            </div>

            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full flex items-center gap-1",
                priorityColors[task.priority]
              )}
            >
              {task.priority === "high" && <AlertCircle className="w-3 h-3" />}
              {task.priority}
            </span>
          </div>
        ))}
      </div>

      <button
        className="w-full mt-4 py-2 text-sm text-primary hover:underline"
        onClick={() => onNavigate?.("projects")}
      >
        View all tasks →
      </button>
    </div>
  );
}
