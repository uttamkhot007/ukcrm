import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, parseISO, subDays } from "date-fns";
import {
  Users,
  HeartPulse,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Frown,
  Smile,
  Meh,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface EmployeeMetrics {
  totalEmployees: number;
  activeEmployees: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgWorkload: number | null;
  burnoutRiskCount: number;
  attendanceToday: number;
  pendingRequests: number;
  onboardingInProgress: number;
  onboardingCompleted: number;
}

interface PeopleInsight {
  name: string;
  risk_score: number;
  risk_level: string;
  department: string | null;
  sentiment_score: number | null;
  factors: Record<string, number>;
}

export function EmployeeIntelligenceDashboard() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [peopleInsights, setPeopleInsights] = useState<PeopleInsight[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const tenantId = currentTenant?.id;

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["ei-profiles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("profiles") as any)
        .select("user_id, full_name, department, employment_status")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: pulseCheckins = [], isLoading: pulseLoading } = useQuery({
    queryKey: ["ei-pulse", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const since = format(subDays(new Date(), 14), "yyyy-MM-dd");
      const { data, error } = await (supabase.from("employee_pulse_checkins") as any)
        .select("user_id, mood_score, energy_level, workload_level, checkin_date")
        .eq("tenant_id", tenantId)
        .gte("checkin_date", since);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["ei-attendance", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await (supabase.from("attendance") as any)
        .select("user_id, check_in")
        .eq("tenant_id", tenantId)
        .gte("check_in", `${today}T00:00:00`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["ei-requests", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("employee_requests") as any)
        .select("id, status, created_at")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "under_review"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: onboarding = [], isLoading: onboardingLoading } = useQuery({
    queryKey: ["ei-onboarding", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("onboarding_requests") as any)
        .select("id, status")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "in_progress", "completed"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const metrics = useMemo<EmployeeMetrics>(() => {
    const totalEmployees = profiles.length;
    const activeEmployees = profiles.filter((p: any) => p.employment_status === "active").length;

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const moods = pulseCheckins.map((p: any) => Number(p.mood_score)).filter((n) => !isNaN(n) && n > 0);
    const energies = pulseCheckins.map((p: any) => Number(p.energy_level)).filter((n) => !isNaN(n) && n > 0);
    const workloads = pulseCheckins.map((p: any) => Number(p.workload_level)).filter((n) => !isNaN(n) && n > 0);

    const avgMood = moods.length ? avg(moods) : null;
    const avgEnergy = energies.length ? avg(energies) : null;
    const avgWorkload = workloads.length ? avg(workloads) : null;

    // Burnout heuristic: low mood + high workload + low energy.
    const byUser = new Map<string, { moods: number[]; energies: number[]; workloads: number[] }>();
    pulseCheckins.forEach((p: any) => {
      const existing = byUser.get(p.user_id) || { moods: [], energies: [], workloads: [] };
      if (p.mood_score) existing.moods.push(Number(p.mood_score));
      if (p.energy_level) existing.energies.push(Number(p.energy_level));
      if (p.workload_level) existing.workloads.push(Number(p.workload_level));
      byUser.set(p.user_id, existing);
    });
    let burnoutRiskCount = 0;
    byUser.forEach((v) => {
      const m = avg(v.moods);
      const e = avg(v.energies);
      const w = avg(v.workloads);
      if (m && e && w && m < 2.5 && e < 2.5 && w > 3.5) burnoutRiskCount++;
    });

    const attendanceToday = new Set(attendance.map((a: any) => a.user_id)).size;
    const pendingRequests = requests.length;
    const onboardingInProgress = onboarding.filter((o: any) => o.status === "in_progress").length;
    const onboardingCompleted = onboarding.filter((o: any) => o.status === "completed").length;

    return {
      totalEmployees,
      activeEmployees,
      avgMood,
      avgEnergy,
      avgWorkload,
      burnoutRiskCount,
      attendanceToday,
      pendingRequests,
      onboardingInProgress,
      onboardingCompleted,
    };
  }, [profiles, pulseCheckins, attendance, requests, onboarding]);

  const moodDistribution = useMemo(() => {
    const buckets = [
      { label: "Great (4-5)", count: 0, color: "hsl(var(--chart-1))" },
      { label: "Okay (3)", count: 0, color: "hsl(var(--chart-3))" },
      { label: "Low (1-2)", count: 0, color: "hsl(var(--chart-5))" },
    ];
    pulseCheckins.forEach((p: any) => {
      const m = Number(p.mood_score);
      if (!m) return;
      if (m >= 4) buckets[0].count++;
      else if (m >= 3) buckets[1].count++;
      else buckets[2].count++;
    });
    return buckets;
  }, [pulseCheckins]);

  const fetchAiInsights = async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("people-intelligence-analyze", {
        body: {
          tenant_id: tenantId,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setPeopleInsights(data.results || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "People intelligence failed");
    } finally {
      setAiLoading(false);
    }
  };

  const isLoading = profilesLoading || pulseLoading || attendanceLoading || requestsLoading || onboardingLoading;

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
          <h1 className="text-3xl font-bold tracking-tight">People Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Sentiment, wellbeing risk, attendance, and onboarding funnel across the workspace.
          </p>
        </div>
        <Button onClick={fetchAiInsights} disabled={aiLoading} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {aiLoading ? "Analysing…" : "Run AI Wellbeing Check"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="ai">AI Risk View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <EmployeeMetricCard title="Total Employees" value={metrics.totalEmployees} subtitle={`${metrics.activeEmployees} active`} icon={Users} />
            <EmployeeMetricCard
              title="Avg Mood"
              value={metrics.avgMood ? metrics.avgMood.toFixed(1) : "—"}
              subtitle={metrics.avgMood ? (metrics.avgMood >= 3.5 ? "Positive" : metrics.avgMood >= 2.5 ? "Neutral" : "Needs attention") : "No check-ins"}
              icon={metrics.avgMood && metrics.avgMood >= 3.5 ? Smile : metrics.avgMood && metrics.avgMood >= 2.5 ? Meh : Frown}
              accent={metrics.avgMood && metrics.avgMood >= 3.5 ? "text-emerald-500" : metrics.avgMood && metrics.avgMood >= 2.5 ? "text-amber-500" : "text-destructive"}
            />
            <EmployeeMetricCard
              title="Burnout Risk"
              value={metrics.burnoutRiskCount}
              subtitle={`${metrics.attendanceToday} checked in today`}
              icon={AlertTriangle}
              accent={metrics.burnoutRiskCount > 0 ? "text-destructive" : "text-emerald-500"}
            />
            <EmployeeMetricCard
              title="Pending Requests"
              value={metrics.pendingRequests}
              subtitle={`${metrics.onboardingInProgress} onboarding in progress`}
              icon={CalendarCheck}
            />
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" />
                Mood Distribution (last 14 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {moodDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EmployeeMetricCard title="Avg Energy" value={metrics.avgEnergy ? metrics.avgEnergy.toFixed(1) : "—"} subtitle="1 (low) to 5 (high)" icon={TrendingUp} />
            <EmployeeMetricCard title="Avg Workload" value={metrics.avgWorkload ? metrics.avgWorkload.toFixed(1) : "—"} subtitle="1 (low) to 5 (high)" icon={TrendingUp} />
            <EmployeeMetricCard title="Check-ins" value={pulseCheckins.length} subtitle="Last 14 days" icon={CalendarCheck} />
          </div>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-500">{metrics.onboardingInProgress}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-500">{metrics.onboardingCompleted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.onboardingInProgress + metrics.onboardingCompleted}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion rate</span>
                  <span>
                    {metrics.onboardingInProgress + metrics.onboardingCompleted > 0
                      ? ((metrics.onboardingCompleted / (metrics.onboardingInProgress + metrics.onboardingCompleted)) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    metrics.onboardingInProgress + metrics.onboardingCompleted > 0
                      ? (metrics.onboardingCompleted / (metrics.onboardingInProgress + metrics.onboardingCompleted)) * 100
                      : 0
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {peopleInsights ? (
            <div className="grid grid-cols-1 gap-4">
              {peopleInsights.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-muted-foreground">
                    No wellbeing risk detected in the last 14 days.
                  </CardContent>
                </Card>
              ) : (
                peopleInsights.map((insight) => (
                  <Card key={insight.name}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          {insight.name}
                        </span>
                        <Badge variant={insight.risk_level === "high" ? "destructive" : insight.risk_level === "medium" ? "default" : "secondary"}>
                          {insight.risk_level} risk
                        </Badge>
                      </CardTitle>
                      <CardDescription>{insight.department || "No department"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1">Risk score</p>
                          <Progress value={insight.risk_score} />
                        </div>
                        <span className="text-lg font-bold">{insight.risk_score}</span>
                      </div>
                      {insight.sentiment_score !== null && (
                        <p className="text-sm text-muted-foreground">
                          Sentiment score: <strong>{insight.sentiment_score}</strong>
                        </p>
                      )}
                      {Object.keys(insight.factors).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(insight.factors).map(([factor, score]) => (
                            <Badge key={factor} variant="outline">
                              {factor.replace(/_/g, " ")}: {score}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-4 text-primary" />
              <p className="text-lg font-medium">Run the AI wellbeing check to see risk profiles</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeeMetricCard({
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
