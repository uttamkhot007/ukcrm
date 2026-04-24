import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Sparkles, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Users,
  BarChart3,
  Milestone,
  Calendar
} from "lucide-react";
import { format, differenceInWeeks } from "date-fns";
import { toast } from "sonner";
import { ProjectPlanOverview } from "./detail-tabs/ProjectPlanOverview";
import { ProjectDeliverables } from "./detail-tabs/ProjectDeliverables";
import { ProjectRACI } from "./detail-tabs/ProjectRACI";
import { ProjectTeam } from "./detail-tabs/ProjectTeam";
import { ProjectGantt } from "./detail-tabs/ProjectGantt";
import { ProjectMilestonesTab } from "./detail-tabs/ProjectMilestonesTab";

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEnriching, setIsEnriching] = useState(false);

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          organization:alliance_organizations(id, name)
        `)
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks for this project
  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch stakeholders
  const { data: stakeholders } = useQuery({
    queryKey: ["project-stakeholders", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_stakeholders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch phases
  const { data: phases } = useQuery({
    queryKey: ["project-phases", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_number");
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === "in_progress").length || 0;
  const pendingTasks = totalTasks - completedTasks - inProgressTasks;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate workload distribution per team member
  const workloadByMember = stakeholders
    ?.filter(s => s.stakeholder_type === "internal")
    .map(member => {
      const memberTasks = tasks?.filter(t => t.assigned_to === member.user_id) || [];
      return {
        ...member,
        totalTasks: memberTasks.length,
        completed: memberTasks.filter(t => t.status === "completed").length,
        inProgress: memberTasks.filter(t => t.status === "in_progress").length,
      };
    }) || [];

  const getDurationBadge = () => {
    if (project?.duration_weeks) {
      return `${project.duration_weeks} weeks`;
    }
    if (project?.start_date && project?.end_date) {
      const weeks = differenceInWeeks(new Date(project.end_date), new Date(project.start_date));
      return `${weeks} weeks`;
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-500";
      case "planning": return "bg-blue-500/10 text-blue-500";
      case "on_hold": return "bg-yellow-500/10 text-yellow-500";
      case "completed": return "bg-primary/10 text-primary";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleEnrichWithAI = async () => {
    setIsEnriching(true);
    try {
      const response = await supabase.functions.invoke("enrich-project-plan", {
        body: { projectId },
      });
      
      if (response.error) throw response.error;
      
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-phases", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      toast.success("Project plan enriched with AI!");
    } catch (error: any) {
      toast.error("Failed to enrich project: " + error.message);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleExportPlan = () => {
    toast.info("Export functionality coming soon");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{project.organization?.name || project.client_name}</span>
                {stakeholders && stakeholders.filter(s => s.stakeholder_type === "internal").length > 0 && (
                  <>
                    <span>•</span>
                    <Users className="h-4 w-4" />
                    <span>{stakeholders.filter(s => s.stakeholder_type === "internal").length} Consultants</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleEnrichWithAI}
            disabled={isEnriching}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {isEnriching ? "Enriching..." : "Enrich with AI"}
          </Button>
          <Button variant="outline" onClick={handleExportPlan}>
            <Download className="h-4 w-4 mr-1" /> Export Plan
          </Button>
          {getDurationBadge() && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getDurationBadge()}
            </Badge>
          )}
          <Badge className={getStatusColor(project.status)}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold">{progressPercent}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <Progress value={progressPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedTasks}</p>
                <p className="text-xs text-muted-foreground">of {totalTasks} tasks</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressTasks}</p>
                <p className="text-xs text-muted-foreground">active tasks</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingTasks}</p>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload Distribution */}
      {workloadByMember.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Consultant Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {workloadByMember.map((member) => (
                <div key={member.id} className="p-3 border rounded-lg">
                  <Badge className="mb-2" variant="secondary">{member.name}</Badge>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks</span>
                      <span className="font-medium">{member.totalTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="text-green-600">{member.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">In Progress</span>
                      <span className="text-blue-600">{member.inProgress}</span>
                    </div>
                  </div>
                  <Progress 
                    value={member.totalTasks > 0 ? (member.completed / member.totalTasks) * 100 : 0} 
                    className="mt-2 h-1" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
          <TabsTrigger 
            value="overview" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FileText className="h-4 w-4 mr-1" /> Plan Overview
          </TabsTrigger>
          <TabsTrigger 
            value="deliverables"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Deliverables
          </TabsTrigger>
          <TabsTrigger 
            value="raci"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Users className="h-4 w-4 mr-1" /> RACI Matrix
          </TabsTrigger>
          <TabsTrigger 
            value="team"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Users className="h-4 w-4 mr-1" /> Project Team
          </TabsTrigger>
          <TabsTrigger 
            value="gantt"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Calendar className="h-4 w-4 mr-1" /> Gantt Chart
          </TabsTrigger>
          <TabsTrigger 
            value="milestones"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Milestone className="h-4 w-4 mr-1" /> Milestones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectPlanOverview 
            project={project} 
            phases={phases || []} 
            tasks={tasks || []}
            stakeholders={stakeholders || []}
          />
        </TabsContent>

        <TabsContent value="deliverables" className="mt-4">
          <ProjectDeliverables project={project} phases={phases || []} />
        </TabsContent>

        <TabsContent value="raci" className="mt-4">
          <ProjectRACI projectId={projectId} stakeholders={stakeholders || []} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <ProjectTeam projectId={projectId} stakeholders={stakeholders || []} />
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <ProjectGantt project={project} phases={phases || []} tasks={tasks || []} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <ProjectMilestonesTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
