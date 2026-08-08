import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FolderKanban } from "lucide-react";
import { format } from "date-fns";
import { ProjectCreationWizard } from "./ProjectCreationWizard";
import { ProjectDetailView } from "./ProjectDetailView";

export function ProjectsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,project_number.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      planning: { label: "Planning", variant: "outline" },
      active: { label: "Active", variant: "default" },
      on_hold: { label: "On Hold", variant: "secondary" },
      completed: { label: "Completed", variant: "default" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: "Low", className: "bg-muted text-muted-foreground" },
      medium: { label: "Medium", className: "bg-blue-100 text-blue-700" },
      high: { label: "High", className: "bg-amber-100 text-amber-700" },
      critical: { label: "Critical", className: "bg-red-100 text-red-700" },
    };
    const config = priorityConfig[priority] || { label: priority, className: "" };
    return <Badge className={config.className} variant="outline">{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show detail view if a project is selected
  if (selectedProjectId) {
    return (
      <ProjectDetailView 
        projectId={selectedProjectId} 
        onBack={() => setSelectedProjectId(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead className="text-right">Budget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading projects...
                </TableCell>
              </TableRow>
            ) : projects?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No projects found</p>
                </TableCell>
              </TableRow>
            ) : (
              projects?.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {project.project_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{project.client_name || "-"}</TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell>{getPriorityBadge(project.priority || "medium")}</TableCell>
                  <TableCell>
                    <div className="w-24">
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress || 0} className="h-2" />
                        <span className="text-xs text-muted-foreground">
                          {project.progress || 0}%
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.start_date && project.end_date ? (
                      <span className="text-sm">
                        {format(new Date(project.start_date), "MMM d")} -{" "}
                        {format(new Date(project.end_date), "MMM d, yyyy")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {project.budget ? formatCurrency(Number(project.budget)) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProjectCreationWizard open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen} />
    </div>
  );
}
