import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Milestone } from "lucide-react";
import { format, isPast } from "date-fns";
import { useTenant } from "@/contexts/TenantContext";

export function ProjectMilestones() {
  const { currentTenant } = useTenant();
  
  const { data: milestones, isLoading } = useQuery({
    queryKey: ["project-milestones", currentTenant?.id],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select("id, name, description, due_date, status, completed_at, project:projects(name, project_number)")
        .eq("tenant_id", currentTenant!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "completed") {
      return <Badge variant="default">Completed</Badge>;
    }
    if (status === "missed" || (status === "pending" && isPast(new Date(dueDate)))) {
      return <Badge variant="destructive">Missed</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Milestone</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading milestones...
                </TableCell>
              </TableRow>
            ) : milestones?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Milestone className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No milestones found</p>
                </TableCell>
              </TableRow>
            ) : (
              milestones?.map((milestone) => (
                <TableRow key={milestone.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{milestone.name}</p>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{milestone.project?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {milestone.project?.project_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(milestone.due_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(milestone.status, milestone.due_date)}
                  </TableCell>
                  <TableCell>
                    {milestone.completed_at
                      ? format(new Date(milestone.completed_at), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
