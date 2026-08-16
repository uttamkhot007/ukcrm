import { chartTooltipProps } from "@/lib/chart-theme";
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
import { format, parseISO, isBefore, differenceInHours, subDays } from "date-fns";
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  LifeBuoy,
  TrendingUp,
  MessageSquare,
  Headphones,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SlaCommandCenter } from "./SlaCommandCenter";

interface SupportMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  overdueTickets: number;
  criticalTickets: number;
  avgResolutionHours: number | null;
  slaBreaches: number;
  ticketsBySeverity: { name: string; value: number; color: string }[];
}

interface SupportInsights {
  response: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(var(--chart-5))",
  high: "hsl(var(--chart-4))",
  medium: "hsl(var(--chart-3))",
  low: "hsl(var(--chart-2))",
};

export function SupportIntelligenceDashboard() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("overview");
  const [aiInsights, setAiInsights] = useState<SupportInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const tenantId = currentTenant?.id;

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["si-tickets", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("customer_support_tickets") as any)
        .select("id, ticket_number, status, severity, created_at, resolved_at, sla_deadline")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const metrics = useMemo<SupportMetrics>(() => {
    const now = new Date();
    const totalTickets = tickets.length;
    const openTickets = tickets.filter((t: any) => t.status === "open").length;
    const inProgressTickets = tickets.filter((t: any) => t.status === "in_progress").length;
    const resolvedToday = tickets.filter((t: any) => {
      if (!t.resolved_at) return false;
      return format(parseISO(t.resolved_at), "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    }).length;

    const overdueTickets = tickets.filter((t: any) => {
      return t.sla_deadline && isBefore(parseISO(t.sla_deadline), now) && !["resolved", "closed"].includes(t.status);
    }).length;
    const criticalTickets = tickets.filter((t: any) => t.severity === "critical" && !["resolved", "closed"].includes(t.status)).length;

    const resolvedTickets = tickets.filter((t: any) => t.resolved_at && t.created_at);
    const avgResolutionHours = resolvedTickets.length
      ? resolvedTickets.reduce((s: number, t: any) => s + Math.abs(differenceInHours(parseISO(t.resolved_at), parseISO(t.created_at))), 0) /
        resolvedTickets.length
      : null;

    const slaBreaches = tickets.filter((t: any) => {
      if (!t.sla_deadline || !t.created_at) return false;
      return t.status === "resolved" && isBefore(parseISO(t.sla_deadline), parseISO(t.resolved_at));
    }).length;

    const severityMap = new Map<string, number>();
    tickets.forEach((t: any) => {
      const sev = t.severity || "unknown";
      severityMap.set(sev, (severityMap.get(sev) || 0) + 1);
    });
    const ticketsBySeverity = Array.from(severityMap.entries()).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name] || "hsl(var(--muted))",
    }));

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedToday,
      overdueTickets,
      criticalTickets,
      avgResolutionHours,
      slaBreaches,
      ticketsBySeverity,
    };
  }, [tickets]);

  const fetchAiInsights = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-assistant", {
        body: {
          messages: [
            {
              role: "user",
              content: `Triage the support queue for this tenant. Metrics: total ${metrics.totalTickets}, open ${metrics.openTickets}, in-progress ${metrics.inProgressTickets}, overdue ${metrics.overdueTickets}, critical ${metrics.criticalTickets}, SLA breaches ${metrics.slaBreaches}, avg resolution ${metrics.avgResolutionHours ? metrics.avgResolutionHours.toFixed(1) : "N/A"} hours. Provide a concise triage summary and 3 prioritised actions.`,
            },
          ],
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAiInsights({ response: data.response });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Support insight failed");
    } finally {
      setAiLoading(false);
    }
  };

  const isLoading = ticketsLoading;

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
          <h1 className="text-3xl font-bold tracking-tight">Support Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Queue health, SLA exposure, severity breakdown and AI triage.
          </p>
        </div>
        <Button onClick={fetchAiInsights} disabled={aiLoading} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {aiLoading ? "Analysing…" : "AI Triage"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="command">SLA Command Center</TabsTrigger>
          <TabsTrigger value="severity">Severity</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="ai">AI Triage</TabsTrigger>
        </TabsList>

        <TabsContent value="command" className="space-y-4">
          <SlaCommandCenter />
        </TabsContent>


        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SupportMetricCard title="Open Tickets" value={metrics.openTickets} subtitle={`${metrics.inProgressTickets} in progress`} icon={Ticket} />
            <SupportMetricCard
              title="Overdue / SLA Breach"
              value={metrics.overdueTickets}
              subtitle={`${metrics.slaBreaches} historical breaches`}
              icon={Clock}
              accent={metrics.overdueTickets > 0 ? "text-destructive" : "text-emerald-500"}
            />
            <SupportMetricCard
              title="Critical"
              value={metrics.criticalTickets}
              subtitle="Unclosed critical"
              icon={AlertTriangle}
              accent={metrics.criticalTickets > 0 ? "text-destructive" : "text-emerald-500"}
            />
            <SupportMetricCard
              title="Resolved Today"
              value={metrics.resolvedToday}
              subtitle={`Avg resolution ${metrics.avgResolutionHours ? metrics.avgResolutionHours.toFixed(1) : "—"}h`}
              icon={CheckCircle2}
              accent="text-emerald-500"
            />
          </div>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                Tickets by Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.ticketsBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip {...chartTooltipProps} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {metrics.ticketsBySeverity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.totalTickets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">SLA Breaches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{metrics.slaBreaches}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.avgResolutionHours ? `${metrics.avgResolutionHours.toFixed(1)}h` : "—"}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Closed tickets</span>
                  <span>
                    {metrics.totalTickets > 0
                      ? (((metrics.totalTickets - metrics.openTickets - metrics.inProgressTickets) / metrics.totalTickets) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    metrics.totalTickets > 0
                      ? ((metrics.totalTickets - metrics.openTickets - metrics.inProgressTickets) / metrics.totalTickets) * 100
                      : 0
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {aiInsights ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  AI Triage Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {aiInsights.response}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-4 text-primary" />
              <p className="text-lg font-medium">Run AI triage to see prioritised actions</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SupportMetricCard({
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
