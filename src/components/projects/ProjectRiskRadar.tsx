import { chartTooltipProps } from "@/lib/chart-theme";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarClock, ListChecks, ShieldAlert } from "lucide-react";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { rankProjectRisks, buildDeliveryTrend, riskLevelClass } from "@/lib/delivery-intelligence";

export function ProjectRiskRadar() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["prr-projects", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("projects") as any)
        .select(
          "id, name, status, budget, spent_amount, progress, start_date, end_date, actual_start_date, actual_end_date, project_manager_id",
        )
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const projectIds = useMemo(() => projects.map((p: any) => p.id), [projects]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["prr-tasks", tenantId, projectIds.length],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data, error } = await (supabase.from("project_tasks") as any)
        .select("id, project_id, status, due_date, assigned_to")
        .in("project_id", projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  const { data: milestones = [], isLoading: msLoading } = useQuery({
    queryKey: ["prr-milestones", tenantId, projectIds.length],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data, error } = await (supabase.from("project_milestones") as any)
        .select("id, project_id, name, status, due_date, completed_at")
        .in("project_id", projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  const risks = useMemo(() => rankProjectRisks(projects, tasks, milestones), [projects, tasks, milestones]);
  const trend = useMemo(() => buildDeliveryTrend(milestones), [milestones]);

  const burnData = useMemo(
    () =>
      risks.slice(0, 8).map((r) => ({
        name: r.name?.slice(0, 18) ?? "Project",
        progress: r.progress,
        expected: r.expectedProgress ?? 0,
        burn: r.budgetBurn !== null ? Math.round(r.budgetBurn) : 0,
      })),
    [risks],
  );

  if (projectsLoading || tasksLoading || msLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const kpis = [
    { label: "Active projects", value: risks.length, icon: ListChecks, tone: "text-foreground" },
    {
      label: "Critical risk",
      value: risks.filter((r) => r.level === "critical").length,
      icon: ShieldAlert,
      tone: "text-destructive",
    },
    {
      label: "Past due",
      value: risks.filter((r) => (r.daysToDeadline ?? 1) < 0).length,
      icon: CalendarClock,
      tone: "text-orange-500",
    },
    {
      label: "Slipped milestones",
      value: risks.reduce((s, r) => s + r.slippedMilestones, 0),
      icon: AlertTriangle,
      tone: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className={`h-4 w-4 ${k.tone}`} aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${k.tone}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On-time delivery trend</CardTitle>
            <CardDescription>Milestones completed per month vs on-time rate</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} fontSize={12} />
                <Tooltip {...chartTooltipProps} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="onTimeRate"
                  name="On-time %"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress vs budget burn</CardTitle>
            <CardDescription>Highest-risk projects — burn above progress means overspend</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={burnData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis fontSize={12} />
                <Tooltip {...chartTooltipProps} />
                <Legend />
                <Bar dataKey="progress" name="Progress %" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expected" name="Expected %" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="burn" name="Budget burn %" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automated risk detection</CardTitle>
          <CardDescription>Ranked delivery risk with recommended recovery actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {risks.length === 0 && (
            <p className="text-sm text-muted-foreground">No active projects to assess.</p>
          )}
          {risks.slice(0, 12).map((r) => (
            <div key={r.projectId} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={riskLevelClass(r.level)}>
                    {r.level} · {r.score}
                  </Badge>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.daysToDeadline === null
                      ? "no end date"
                      : r.daysToDeadline < 0
                        ? `${Math.abs(r.daysToDeadline)}d overdue`
                        : `${r.daysToDeadline}d left`}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {r.overdueTasks} overdue / {r.openTasks} open tasks
                </span>
              </div>
              <Progress value={r.progress} aria-label={`${r.name} progress`} />
              <div className="flex flex-wrap gap-1">
                {r.drivers.map((d) => (
                  <Badge key={d.label} variant="secondary" className="text-xs font-normal">
                    {d.label}: {d.detail}
                  </Badge>
                ))}
              </div>
              {r.actions.length > 0 && (
                <ul className="text-sm list-disc pl-5 space-y-0.5">
                  {r.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
