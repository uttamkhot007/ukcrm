import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, Gauge, Timer, UserPlus, ShieldAlert } from "lucide-react";
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
import {
  prioritizeTickets,
  buildSlaTrend,
  summarizeSlaHealth,
  riskLevelClass,
  formatHours,
} from "@/lib/delivery-intelligence";

export function SlaCommandCenter() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["sla-command-center", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("customer_support_tickets") as any)
        .select(
          "id, ticket_number, title, status, severity, impact, assigned_to, assigned_team, created_at, resolved_at, sla_deadline",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const prioritized = useMemo(() => prioritizeTickets(tickets), [tickets]);
  const health = useMemo(() => summarizeSlaHealth(prioritized), [prioritized]);
  const trend = useMemo(() => buildSlaTrend(tickets), [tickets]);

  const latestCompliance = useMemo(() => {
    const withValue = trend.filter((t) => t.compliance !== null);
    return withValue.length ? withValue[withValue.length - 1].compliance : null;
  }, [trend]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sla-command-center", tenantId] });

  const claimTicket = async (ticketId: string) => {
    if (!user?.id || !tenantId) return;
    const { error } = await (supabase.from("customer_support_tickets") as any)
      .update({ assigned_to: user.id, status: "in_progress" })
      .eq("id", ticketId)
      .eq("tenant_id", tenantId);
    if (error) {
      toast.error("Could not assign ticket", { description: error.message });
      return;
    }
    toast.success("Ticket assigned to you and moved to in progress");
    refresh();
  };

  const escalateTicket = async (ticketId: string) => {
    if (!tenantId) return;
    const { error } = await (supabase.from("customer_support_tickets") as any)
      .update({ severity: "critical", status: "in_progress" })
      .eq("id", ticketId)
      .eq("tenant_id", tenantId);
    if (error) {
      toast.error("Could not escalate ticket", { description: error.message });
      return;
    }
    toast.success("Ticket escalated to critical");
    refresh();
  };

  if (isLoading) {
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
    { label: "Open tickets", value: health.open, icon: Gauge, tone: "text-foreground" },
    { label: "SLA breached", value: health.breached, icon: ShieldAlert, tone: "text-destructive" },
    { label: "At risk (24h)", value: health.atRisk, icon: Timer, tone: "text-amber-500" },
    { label: "Unassigned", value: health.unassigned, icon: UserPlus, tone: "text-orange-500" },
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
            <CardTitle className="text-base">SLA compliance & MTTR trend</CardTitle>
            <CardDescription>
              Last 8 weeks{latestCompliance !== null ? ` — latest compliance ${latestCompliance}%` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="compliance"
                  name="Compliance %"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mttrHours"
                  name="MTTR (h)"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inflow vs resolved</CardTitle>
            <CardDescription>Weekly ticket volume and breaches</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Created" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="breaches" name="Breached" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Prioritized action queue
          </CardTitle>
          <CardDescription>Ranked by SLA risk score — work top-down</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {prioritized.length === 0 && (
            <p className="text-sm text-muted-foreground">No open tickets. Support queue is clear.</p>
          )}
          {prioritized.slice(0, 15).map((t) => (
            <div key={t.ticketId} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={riskLevelClass(t.level)}>
                      {t.level} · {t.score}
                    </Badge>
                    <span className="font-medium truncate">{t.title || t.ticketNumber || "Ticket"}</span>
                    {t.ticketNumber && (
                      <span className="text-xs text-muted-foreground">#{t.ticketNumber}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.breached
                      ? `SLA breached by ${formatHours(t.hoursToBreach ?? 0)}`
                      : t.hoursToBreach !== null
                        ? `${formatHours(t.hoursToBreach)} to SLA deadline`
                        : "No SLA deadline set"}{" "}
                    · age {formatHours(t.ageHours)} · {t.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!t.assignedTo && (
                    <Button size="sm" variant="outline" onClick={() => claimTicket(t.ticketId)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                      Assign to me
                    </Button>
                  )}
                  {t.severity !== "critical" && (
                    <Button size="sm" variant="outline" onClick={() => escalateTicket(t.ticketId)}>
                      <ArrowUpRight className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                      Escalate
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm">{t.action}</p>
              <div className="flex flex-wrap gap-1">
                {t.drivers.map((d) => (
                  <Badge key={d.label} variant="secondary" className="text-xs font-normal">
                    {d.label}: {d.detail}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
