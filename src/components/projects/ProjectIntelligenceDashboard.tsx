import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, isBefore, subDays } from "date-fns";
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Sparkles,
  Lightbulb,
  BarChart3,
  Target,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { ProjectRiskRadar } from "./ProjectRiskRadar";

interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  atRiskProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  avgProgress: number;
  overdueTasks: number;
  totalTasks: number;
  billableHours: number;
  nonBillableHours: number;
  scheduleVariance: number;
}

interface ProjectInsights {
  predictions: string[];
  recommendations: string[];
  risks: string[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "hsl(var(--chart-1))",
  completed: "hsl(var(--chart-2))",
  on_hold: "hsl(var(--chart-3))",
  cancelled: "hsl(var(--chart-4))",
  at_risk: "hsl(var(--chart-5))",
};

export function ProjectIntelligenceDashboard() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("overview");
  const [aiInsights, setAiInsights] = useState<ProjectInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const tenantId = currentTenant?.id;

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["pi-projects", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("projects") as any)
        .select("id, name, status, budget, spent_amount, progress, start_date, end_date, actual_start_date, actual_end_date, project_manager_id")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["pi-tasks", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("project_tasks") as any)
        .select("id, status, due_date, estimated_hours, actual_hours, assigned_to, project_id")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ["pi-milestones", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("project_milestones") as any)
        .select("id, due_date, completed_at, project_id")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ["pi-time", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("project_time_entries") as any)
        .select("hours, is_billable, project_id")
        .eq("tenant_id", tenantId)
        .gte("date", format(subDays(new Date(), 90), "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const metrics = useMemo<ProjectMetrics>(() => {
    const today = new Date();
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p: any) => p.status === "active").length;
    const completedProjects = projects.filter((p: any) => p.status === "completed").length;

    const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.budget || 0), 0);
    const totalSpent = projects.reduce((s: number, p: any) => s + Number(p.spent_amount || 0), 0);
    const avgProgress = totalProjects
      ? projects.reduce((s: number, p: any) => s + Number(p.progress || 0), 0) / totalProjects
      : 0;

    const totalTasks = tasks.length;
    const overdueTasks = tasks.filter((t: any) => t.due_date && isBefore(parseISO(t.due_date), today) && t.status !== "completed").length;

    const billableHours = timeEntries.filter((t: any) => t.is_billable).reduce((s: number, t: any) => s + Number(t.hours || 0), 0);
    const nonBillableHours = timeEntries.filter((t: any) => !t.is_billable).reduce((s: number, t: any) => s + Number(t.hours || 0), 0);

    // Schedule variance: projects with actual end date past planned end date.
    let scheduleVariance = 0;
    projects.forEach((p: any) => {
      if (p.end_date && p.actual_end_date) {
        const planned = parseISO(p.end_date);
        const actual = parseISO(p.actual_end_date);
        if (isBefore(planned, actual)) scheduleVariance += differenceInDays(actual, planned);
      }
    });

    // At-risk: active projects with overdue tasks or budget > 90% or progress < 50% with <14 days remaining.
    const atRiskProjects = projects.filter((p: any) => {
      if (p.status !== "active") return false;
      const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
      const hasOverdue = projectTasks.some((t: any) => t.due_date && isBefore(parseISO(t.due_date), today) && t.status !== "completed");
      const budgetBurn = p.budget ? (p.spent_amount / p.budget) : 0;
      const daysRemaining = p.end_date ? differenceInDays(parseISO(p.end_date), today) : Infinity;
      return hasOverdue || budgetBurn > 0.9 || (daysRemaining < 14 && p.progress < 50);
    }).length;

    return {
      totalProjects,
      activeProjects,
      atRiskProjects,
      completedProjects,
      totalBudget,
      totalSpent,
      avgProgress,
      overdueTasks,
      totalTasks,
      billableHours,
      nonBillableHours,
      scheduleVariance,
    };
  }, [projects, tasks, timeEntries]);

  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p: any) => {
      const status = p.status || "unknown";
      map.set(status, (map.get(status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || "hsl(var(--muted))" }));
  }, [projects]);

  const workloadDistribution = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t: any) => {
      const id = t.assigned_to || "Unassigned";
      map.set(id, (map.get(id) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name === "Unassigned" ? "Unassigned" : name.slice(0, 8), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [tasks]);

  const fetchAiInsights = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("executive-insights", {
        body: {
          dashboardType: "vcro",
          metrics: {
            totalProjects: metrics.totalProjects,
            activeProjects: metrics.activeProjects,
            atRiskProjects: metrics.atRiskProjects,
            completedProjects: metrics.completedProjects,
            totalBudget: metrics.totalBudget,
            totalSpent: metrics.totalSpent,
            budgetUtilisation: metrics.totalBudget > 0 ? (metrics.totalSpent / metrics.totalBudget) * 100 : 0,
            avgProgress: Math.round(metrics.avgProgress),
            overdueTasks: metrics.overdueTasks,
            totalTasks: metrics.totalTasks,
            billableHours: metrics.billableHours,
            nonBillableHours: metrics.nonBillableHours,
            scheduleVarianceDays: metrics.scheduleVariance,
          },
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAiInsights(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI insight failed");
    } finally {
      setAiLoading(false);
    }
  };

  const isLoading = projectsLoading || tasksLoading || milestonesLoading || timeLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Portfolio health, workload balance, schedule risk and AI-driven delivery insights.
          </p>
        </div>
        <Button onClick={fetchAiInsights} disabled={aiLoading} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {aiLoading ? "Analysing…" : "Generate AI Insights"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk Radar</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-4">
          <ProjectRiskRadar />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProjectMetricCard title="Total Projects" value={metrics.totalProjects} subtitle={`${metrics.activeProjects} active`} icon={Briefcase} />
            <ProjectMetricCard
              title="At Risk"
              value={metrics.atRiskProjects}
              subtitle={`${metrics.totalProjects > 0 ? ((metrics.atRiskProjects / metrics.totalProjects) * 100).toFixed(1) : 0}% of portfolio`}
              icon={AlertTriangle}
              accent="text-destructive"
            />
            <ProjectMetricCard
              title="Budget Utilisation"
              value={`${metrics.totalBudget > 0 ? ((metrics.totalSpent / metrics.totalBudget) * 100).toFixed(1) : 0}%`}
              subtitle={`₹${Math.round(metrics.totalSpent).toLocaleString("en-IN")} spent`}
              icon={BarChart3}
            />
            <ProjectMetricCard
              title="Avg Progress"
              value={`${Math.round(metrics.avgProgress)}%`}
              subtitle={`${metrics.overdueTasks} overdue tasks`}
              icon={Target}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Budget vs Spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Budget</span>
                    <span className="font-medium">₹{Math.round(metrics.totalBudget).toLocaleString("en-IN")}</span>
                  </div>
                  <Progress value={metrics.totalBudget > 0 ? (metrics.totalSpent / metrics.totalBudget) * 100 : 0} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-medium">₹{Math.round(metrics.totalSpent).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-medium">
                      ₹{Math.round(Math.max(0, metrics.totalBudget - metrics.totalSpent)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Open Tasks by Assignee
              </CardTitle>
              <CardDescription>Top 10 contributors by open task count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {workloadDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MilestoneCard
              title="Total Milestones"
              value={milestones.length}
              subtitle="Across all projects"
            />
            <MilestoneCard
              title="Completed"
              value={milestones.filter((m: any) => m.completed_at).length}
              subtitle="On-time delivery"
              accent="text-emerald-500"
            />
            <MilestoneCard
              title="Overdue"
              value={milestones.filter((m: any) => m.due_date && !m.completed_at && isBefore(parseISO(m.due_date), new Date())).length}
              subtitle="Need attention"
              accent="text-destructive"
            />
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Cumulative schedule variance across closed projects: <strong>{metrics.scheduleVariance} days</strong>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {aiInsights ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ProjectInsightCard title="Predictions" icon={Lightbulb} items={aiInsights.predictions} />
              <ProjectInsightCard title="Recommendations" icon={CheckCircle2} items={aiInsights.recommendations} />
              <ProjectInsightCard title="Risks" icon={AlertTriangle} items={aiInsights.risks} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-4 text-primary" />
              <p className="text-lg font-medium">Generate AI insights to see delivery recommendations</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "text-primary",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accent}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function MilestoneCard({
  title,
  value,
  subtitle,
  accent = "text-primary",
}: {
  title: string;
  value: number;
  subtitle: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${accent}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ProjectInsightCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.filter(Boolean).map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed border-l-2 border-primary/30 pl-3">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
