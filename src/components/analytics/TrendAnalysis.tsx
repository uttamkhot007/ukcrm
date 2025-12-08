import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calendar, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, subMonths, subYears, startOfMonth, endOfMonth } from "date-fns";

export function TrendAnalysis() {
  const { formatCurrency } = useOrganizationSettings();

  const { data: trendData, isLoading } = useQuery({
    queryKey: ["trend-analysis"],
    queryFn: async () => {
      const now = new Date();
      const currentYearMonths = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(now, 11 - i);
        return { month: format(date, "MMM"), fullMonth: format(date, "MMM yy"), start: startOfMonth(date).toISOString(), end: endOfMonth(date).toISOString() };
      });
      const lastYearMonths = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(subYears(now, 1), 11 - i);
        return { month: format(date, "MMM"), start: startOfMonth(date).toISOString(), end: endOfMonth(date).toISOString() };
      });

      const { data: invoices } = await supabase.from("invoices").select("total_amount, status, created_at").gte("created_at", lastYearMonths[0].start);
      const { data: deals } = await supabase.from("deals").select("value, stage, created_at").gte("created_at", lastYearMonths[0].start);

      const yoyComparison = currentYearMonths.map(({ month, fullMonth, start, end }, index) => {
        const lastYearPeriod = lastYearMonths[index];
        const currentRevenue = invoices?.filter((inv) => inv.created_at >= start && inv.created_at <= end && inv.status === "paid").reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        const lastYearRevenue = invoices?.filter((inv) => inv.created_at >= lastYearPeriod.start && inv.created_at <= lastYearPeriod.end && inv.status === "paid").reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        return { month, fullMonth, currentYear: currentRevenue / 1000, lastYear: lastYearRevenue / 1000, growth: lastYearRevenue > 0 ? ((currentRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0 };
      });

      const currentYearTotal = yoyComparison.reduce((sum, d) => sum + d.currentYear * 1000, 0);
      const lastYearTotal = yoyComparison.reduce((sum, d) => sum + d.lastYear * 1000, 0);
      const overallGrowth = lastYearTotal > 0 ? ((currentYearTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

      const momChanges = currentYearMonths.slice(1).map((curr, index) => {
        const prev = currentYearMonths[index];
        const currRevenue = invoices?.filter((inv) => inv.created_at >= curr.start && inv.created_at <= curr.end && inv.status === "paid").reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        const prevRevenue = invoices?.filter((inv) => inv.created_at >= prev.start && inv.created_at <= prev.end && inv.status === "paid").reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        return { month: curr.fullMonth, revenue: currRevenue / 1000, change: prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0 };
      });

      const conversionTrends = currentYearMonths.map(({ fullMonth, start, end }) => {
        const monthDeals = deals?.filter((d) => d.created_at >= start && d.created_at <= end) || [];
        const won = monthDeals.filter((d) => d.stage === "closed_won").length;
        const lost = monthDeals.filter((d) => d.stage === "closed_lost").length;
        const total = monthDeals.length;
        return { month: fullMonth, winRate: total > 0 ? (won / total) * 100 : 0, lossRate: total > 0 ? (lost / total) * 100 : 0 };
      });

      return {
        yoyComparison, momChanges, conversionTrends, currentYearTotal, lastYearTotal, overallGrowth,
        averageMonthlyRevenue: currentYearTotal / 12,
        bestMonth: yoyComparison.reduce((best, curr) => curr.currentYear > best.currentYear ? curr : best),
        worstMonth: yoyComparison.filter(m => m.currentYear > 0).reduce((worst, curr) => curr.currentYear < worst.currentYear ? curr : worst, yoyComparison[0]),
      };
    },
  });

  if (isLoading) {
    return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((i) => (<Card key={i} className="glass"><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>))}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">YoY Growth</CardTitle>{(trendData?.overallGrowth || 0) >= 0 ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}</CardHeader><CardContent><div className={`text-2xl font-bold ${(trendData?.overallGrowth || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>{(trendData?.overallGrowth || 0) >= 0 ? '+' : ''}{trendData?.overallGrowth?.toFixed(1)}%</div><p className="text-xs text-muted-foreground mt-1">vs last year</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Revenue</CardTitle><BarChart3 className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{formatCurrency(trendData?.averageMonthlyRevenue || 0)}</div><p className="text-xs text-muted-foreground mt-1">This year</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Best Month</CardTitle><ArrowUpRight className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{trendData?.bestMonth?.fullMonth}</div><p className="text-xs text-muted-foreground mt-1">{formatCurrency((trendData?.bestMonth?.currentYear || 0) * 1000)}</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Needs Improvement</CardTitle><ArrowDownRight className="h-4 w-4 text-warning" /></CardHeader><CardContent><div className="text-2xl font-bold text-warning">{trendData?.worstMonth?.fullMonth}</div><p className="text-xs text-muted-foreground mt-1">{formatCurrency((trendData?.worstMonth?.currentYear || 0) * 1000)}</p></CardContent></Card>
      </div>

      <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Year-over-Year Revenue Comparison</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={trendData?.yoyComparison}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}K`} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${formatCurrency(value * 1000)}`, '']} /><Legend /><Bar dataKey="currentYear" name="This Year" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="lastYear" name="Last Year" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Month-over-Month Trend</CardTitle></CardHeader><CardContent><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData?.momChanges}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}K`} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${formatCurrency(value * 1000)}`, 'Revenue']} /><Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div></CardContent></Card>
        <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Deal Win/Loss Rate</CardTitle></CardHeader><CardContent><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData?.conversionTrends}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(1)}%`, '']} /><Legend /><Line type="monotone" dataKey="winRate" name="Win Rate" stroke="hsl(var(--primary))" strokeWidth={2} /><Line type="monotone" dataKey="lossRate" name="Loss Rate" stroke="hsl(var(--destructive))" strokeWidth={2} /></LineChart></ResponsiveContainer></div></CardContent></Card>
      </div>

      <Card className="glass border-border"><CardHeader><CardTitle>Monthly Performance</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{trendData?.momChanges.map((month) => (<Badge key={month.month} variant={month.change >= 0 ? "default" : "destructive"} className="gap-1">{month.month}{month.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{month.change >= 0 ? '+' : ''}{month.change.toFixed(1)}%</Badge>))}</div></CardContent></Card>
    </div>
  );
}
