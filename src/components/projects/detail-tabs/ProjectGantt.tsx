import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, addDays, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectGanttProps {
  project: any;
  phases: any[];
  tasks: any[];
}

export function ProjectGantt({ project, phases, tasks }: ProjectGanttProps) {
  const ganttData = useMemo(() => {
    // Determine project date range
    let startDate = project.start_date ? parseISO(project.start_date) : new Date();
    let endDate = project.end_date ? parseISO(project.end_date) : addDays(startDate, 90);
    
    // Extend range based on tasks if needed
    tasks.forEach(task => {
      if (task.start_date) {
        const taskStart = parseISO(task.start_date);
        if (taskStart < startDate) startDate = taskStart;
      }
      if (task.due_date) {
        const taskEnd = parseISO(task.due_date);
        if (taskEnd > endDate) endDate = taskEnd;
      }
    });

    const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
    const totalDays = differenceInDays(endDate, startDate) + 1;

    // Build items (phases and tasks)
    const items: any[] = [];
    
    phases.forEach(phase => {
      const phaseStart = phase.start_date ? parseISO(phase.start_date) : startDate;
      const phaseEnd = phase.end_date ? parseISO(phase.end_date) : addDays(phaseStart, (phase.duration_weeks || 2) * 7);
      
      items.push({
        id: phase.id,
        type: "phase",
        name: phase.name,
        start: phaseStart,
        end: phaseEnd,
        status: phase.status,
        progress: phase.progress || 0,
      });

      // Add tasks for this phase
      const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
      phaseTasks.forEach(task => {
        const taskStart = task.start_date ? parseISO(task.start_date) : phaseStart;
        const taskEnd = task.due_date ? parseISO(task.due_date) : addDays(taskStart, 7);
        
        items.push({
          id: task.id,
          type: "task",
          name: task.title,
          start: taskStart,
          end: taskEnd,
          status: task.status,
          phaseId: phase.id,
        });
      });
    });

    // Add orphan tasks (not assigned to any phase)
    const orphanTasks = tasks.filter(t => !t.phase_id);
    orphanTasks.forEach(task => {
      const taskStart = task.start_date ? parseISO(task.start_date) : startDate;
      const taskEnd = task.due_date ? parseISO(task.due_date) : addDays(taskStart, 7);
      
      items.push({
        id: task.id,
        type: "task",
        name: task.title,
        start: taskStart,
        end: taskEnd,
        status: task.status,
      });
    });

    return { startDate, endDate, weeks, totalDays, items };
  }, [project, phases, tasks]);

  const getBarPosition = (start: Date, end: Date) => {
    const dayOffset = differenceInDays(start, ganttData.startDate);
    const duration = differenceInDays(end, start) + 1;
    const left = (dayOffset / ganttData.totalDays) * 100;
    const width = (duration / ganttData.totalDays) * 100;
    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "on_hold": return "bg-gray-500";
      default: return "bg-muted-foreground";
    }
  };

  if (ganttData.items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <Calendar className="h-8 w-8 mx-auto mb-2" />
        <p>No timeline data available</p>
        <p className="text-sm">Add phases and tasks with dates to see the Gantt chart</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Project Timeline
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(ganttData.startDate, "MMM d, yyyy")} - {format(ganttData.endDate, "MMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Header with weeks */}
          <div className="flex border-b mb-2 min-w-[800px]">
            <div className="w-48 flex-shrink-0 font-medium text-sm py-2">Activity</div>
            <div className="flex-1 flex">
              {ganttData.weeks.map((week, i) => (
                <div 
                  key={i} 
                  className="flex-1 text-center text-xs text-muted-foreground py-2 border-l"
                >
                  {format(week, "MMM d")}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt rows */}
          <div className="space-y-1 min-w-[800px]">
            {ganttData.items.map((item) => {
              const pos = getBarPosition(item.start, item.end);
              
              return (
                <div key={item.id} className="flex items-center h-8">
                  <div className={cn(
                    "w-48 flex-shrink-0 text-sm truncate pr-2",
                    item.type === "task" && "pl-4 text-muted-foreground"
                  )}>
                    {item.name}
                  </div>
                  <div className="flex-1 relative h-6 bg-muted/30 rounded">
                    <div
                      className={cn(
                        "absolute top-1 bottom-1 rounded",
                        item.type === "phase" ? "bg-primary" : getStatusColor(item.status),
                        item.type === "phase" && "opacity-80"
                      )}
                      style={{ left: pos.left, width: pos.width }}
                    >
                      {item.type === "phase" && item.progress > 0 && (
                        <div 
                          className="absolute inset-0 bg-primary-foreground/20 rounded"
                          style={{ width: `${item.progress}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>Phase</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
