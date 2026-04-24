import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
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
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      // Fetch milestones with tenant filter
      const milestonesResult = await (supabase
        .from("project_milestones") as any)
        .select("id, name, description, due_date, status, completed_at, project_id")
        .eq("tenant_id", currentTenant.id)
        .order("due_date", { ascending: true });
      
      if (milestonesResult.error) throw milestonesResult.error;
      const milestonesData = milestonesResult.data || [];
      if (milestonesData.length === 0) return [];

      // Fetch related projects
      const projectIds = [...new Set(milestonesData.map((m: any) => m.project_id).filter(Boolean))];
      const projectsResult = await (supabase
        .from("projects") as any)
        .select("id, name, project_number")
        .in("id", projectIds);

      const projectsMap = new Map((projectsResult.data || []).map((p: any) => [p.id, p]));

      return milestonesData.map((m: any) => ({
        ...m,
        project: m.project_id ? projectsMap.get(m.project_id) || null : null,
      }));
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
