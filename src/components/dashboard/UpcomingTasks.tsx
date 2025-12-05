import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface Task {
  id: number;
  title: string;
  dueTime: string;
  priority: "high" | "medium" | "low";
  category: string;
}

const tasks: Task[] = [
  {
    id: 1,
    title: "Follow up with TechCorp on proposal",
    dueTime: "10:00 AM",
    priority: "high",
    category: "Sales",
  },
  {
    id: 2,
    title: "Review Q4 budget allocation",
    dueTime: "11:30 AM",
    priority: "high",
    category: "Finance",
  },
  {
    id: 3,
    title: "Interview candidate for Dev role",
    dueTime: "2:00 PM",
    priority: "medium",
    category: "HR",
  },
  {
    id: 4,
    title: "Sprint planning meeting",
    dueTime: "3:30 PM",
    priority: "medium",
    category: "Tech",
  },
  {
    id: 5,
    title: "Approve marketing campaign",
    dueTime: "4:00 PM",
    priority: "low",
    category: "Marketing",
  },
];

const priorityColors = {
  high: "text-destructive bg-destructive/10",
  medium: "text-support bg-support/10",
  low: "text-muted-foreground bg-muted",
};

export function UpcomingTasks() {
  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Today's Tasks</h3>
        <span className="text-sm text-muted-foreground">
          {tasks.length} tasks
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
          >
            <button className="mt-0.5 text-muted-foreground hover:text-primary transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {task.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {task.category}
                </span>
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

      <button className="w-full mt-4 py-2 text-sm text-primary hover:underline">
        View all tasks →
      </button>
    </div>
  );
}
