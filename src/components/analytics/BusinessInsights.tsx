import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, TrendingUp, XCircle, Lightbulb } from "lucide-react";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

export function BusinessInsights() {
  const { formatCurrency } = useOrganizationSettings();

  const { data: insightsData, isLoading } = useQuery({
    queryKey: ["business-insights"],
    queryFn: async () => {
      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const thisMonthEnd = endOfMonth(now).toISOString();

      const [{ data: deals }, { data: invoices }, { data: tickets }, { data: profiles }, { data: contacts }] = await Promise.all([
        supabase.from("deals").select("*"),
        supabase.from("invoices").select("*"),
        supabase.from("tickets").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("contacts").select("*"),
      ]);

      const goingWell: Array<{ title: string; description: string; metric: string; trend: "up" | "stable" }> = [];
      const needsAttention: Array<{ title: string; description: string; metric: string; severity: "warning" | "critical" }> = [];

      const wonDeals = deals?.filter(d => d.stage === "closed_won") || [];
      const lostDeals = deals?.filter(d => d.stage === "closed_lost") || [];
      const winRate = deals?.length ? (wonDeals.length / deals.length) * 100 : 0;
      
      if (winRate > 30) goingWell.push({ title: "Strong Win Rate", description: "Deal conversion is above industry average", metric: `${winRate.toFixed(1)}%`, trend: "up" });
      else if (winRate < 20 && deals?.length) needsAttention.push({ title: "Low Win Rate", description: "Review sales process and qualification", metric: `${winRate.toFixed(1)}%`, severity: "warning" });

      const paidInvoices = invoices?.filter(inv => inv.status === "paid") || [];
      const overdueInvoices = invoices?.filter(inv => inv.status === "overdue") || [];
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

      if (overdueAmount > 0) needsAttention.push({ title: "Overdue Invoices", description: `${overdueInvoices.length} invoices past due date`, metric: formatCurrency(overdueAmount), severity: overdueAmount > totalRevenue * 0.2 ? "critical" : "warning" });
      if (paidInvoices.length > 0) {
        const collectionRate = invoices?.length ? (paidInvoices.length / invoices.length) * 100 : 0;
        if (collectionRate > 80) goingWell.push({ title: "Healthy Cash Collection", description: "Invoices paid on time", metric: `${collectionRate.toFixed(0)}%`, trend: "stable" });
      }

      const resolvedTickets = tickets?.filter(t => t.status === "resolved" || t.status === "closed") || [];
      const openTickets = tickets?.filter(t => t.status === "open" || t.status === "in_progress") || [];
      const highPriorityOpen = openTickets.filter(t => t.priority === "high" || t.priority === "critical");
      if (highPriorityOpen.length > 0) needsAttention.push({ title: "Critical Tickets Pending", description: "High priority tickets need attention", metric: `${highPriorityOpen.length} tickets`, severity: "critical" });

      const resolutionRate = tickets?.length ? (resolvedTickets.length / tickets.length) * 100 : 0;
      if (resolutionRate > 70) goingWell.push({ title: "Efficient Support", description: "Good ticket resolution rate", metric: `${resolutionRate.toFixed(0)}%`, trend: "stable" });

      const uniqueCompanies = new Set(contacts?.map(c => c.company).filter(Boolean)).size;
      const pipelineDeals = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)) || [];
      const pipelineValue = pipelineDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      return {
        goingWell, needsAttention,
        summaryStats: { totalDeals: deals?.length || 0, wonDealsCount: wonDeals.length, lostDealsCount: lostDeals.length, activeDealsCount: pipelineDeals.length, totalRevenue, pipelineValue, totalEmployees: profiles?.length || 0, totalCustomers: uniqueCompanies, totalContacts: contacts?.length || 0, openTickets: openTickets.length, resolvedTickets: resolvedTickets.length },
      };
    },
  });

  if (isLoading) return <div className="space-y-6"><div className="grid gap-6 lg:grid-cols-2">{[1, 2].map((i) => (<Card key={i} className="glass"><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><div className="space-y-4">{[1, 2, 3].map((j) => (<Skeleton key={j} className="h-20 w-full" />))}</div></CardContent></Card>))}</div></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-border"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{insightsData?.summaryStats.totalDeals}</p><p className="text-xs text-muted-foreground">Total Deals</p></div></div></CardContent></Card>
        <Card className="glass border-border"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{formatCurrency(insightsData?.summaryStats.totalRevenue || 0)}</p><p className="text-xs text-muted-foreground">Total Revenue</p></div></div></CardContent></Card>
        <Card className="glass border-border"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Lightbulb className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{insightsData?.summaryStats.totalEmployees}</p><p className="text-xs text-muted-foreground">Employees</p></div></div></CardContent></Card>
        <Card className="glass border-border"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{insightsData?.summaryStats.totalCustomers}</p><p className="text-xs text-muted-foreground">Customers</p></div></div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border border-l-4 border-l-primary"><CardHeader><CardTitle className="flex items-center gap-2 text-primary"><ThumbsUp className="h-5 w-5" />What's Going Well</CardTitle></CardHeader><CardContent><div className="space-y-4">{insightsData?.goingWell.length === 0 ? <p className="text-muted-foreground text-center py-4">Add more data to see insights</p> : insightsData?.goingWell.map((item, index) => (<div key={index} className="p-4 rounded-lg bg-primary/5 border border-primary/20"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary mt-0.5" /><div><h4 className="font-medium text-foreground">{item.title}</h4><p className="text-sm text-muted-foreground mt-1">{item.description}</p></div></div><Badge variant="default" className="shrink-0 gap-1"><TrendingUp className="h-3 w-3" />{item.metric}</Badge></div></div>))}</div></CardContent></Card>
        <Card className="glass border-border border-l-4 border-l-warning"><CardHeader><CardTitle className="flex items-center gap-2 text-warning"><ThumbsDown className="h-5 w-5" />Needs Attention</CardTitle></CardHeader><CardContent><div className="space-y-4">{insightsData?.needsAttention.length === 0 ? <div className="text-center py-4"><CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" /><p className="text-muted-foreground">All systems healthy!</p></div> : insightsData?.needsAttention.map((item, index) => (<div key={index} className={`p-4 rounded-lg border ${item.severity === "critical" ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20"}`}><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3">{item.severity === "critical" ? <XCircle className="h-5 w-5 text-destructive mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />}<div><h4 className="font-medium text-foreground">{item.title}</h4><p className="text-sm text-muted-foreground mt-1">{item.description}</p></div></div><Badge variant={item.severity === "critical" ? "destructive" : "secondary"} className="shrink-0">{item.metric}</Badge></div></div>))}</div></CardContent></Card>
      </div>
    </div>
  );
}
