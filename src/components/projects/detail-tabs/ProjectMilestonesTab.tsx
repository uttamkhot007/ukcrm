import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";
import { Milestone, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectMilestonesTabProps {
  projectId: string;
}

export function ProjectMilestonesTab({ projectId }: ProjectMilestonesTabProps) {
  const { data: milestones, isLoading } = useQuery({
    queryKey: ["project-milestones-detail", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date");
      if (error) throw error;
      return data || [];
    },
  });

  const getStatusIcon = (milestone: any) => {
    if (milestone.status === "completed") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (milestone.status === "missed" || (isPast(new Date(milestone.due_date)) && milestone.status !== "completed")) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    if (isToday(new Date(milestone.due_date))) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (milestone: any) => {
    if (milestone.status === "completed") {
      return <Badge className="bg-green-500/10 text-green-600">Completed</Badge>;
    }
    if (milestone.status === "missed" || (isPast(new Date(milestone.due_date)) && milestone.status !== "completed")) {
      return <Badge className="bg-red-500/10 text-red-600">Missed</Badge>;
    }
    if (isToday(new Date(milestone.due_date))) {
      return <Badge className="bg-yellow-500/10 text-yellow-600">Due Today</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <Milestone className="h-8 w-8 mx-auto mb-2" />
        <p>No milestones defined yet</p>
        <p className="text-sm">Milestones will appear here once added to the project</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline view */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-6">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="relative flex gap-4">
              {/* Icon */}
              <div className="relative z-10 w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center">
                {getStatusIcon(milestone)}
              </div>
              
              {/* Content */}
              <Card className="flex-1">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{milestone.name}</h3>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(milestone)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span>
                      Due: {format(new Date(milestone.due_date), "MMM d, yyyy")}
                    </span>
                    {milestone.completed_at && (
                      <span className="text-green-600">
                        Completed: {format(new Date(milestone.completed_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Milestone Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{milestones.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {milestones.filter(m => m.status === "completed").length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {milestones.filter(m => m.status === "pending" && !isPast(new Date(m.due_date))).length}
              </p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {milestones.filter(m => m.status !== "completed" && isPast(new Date(m.due_date))).length}
              </p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
