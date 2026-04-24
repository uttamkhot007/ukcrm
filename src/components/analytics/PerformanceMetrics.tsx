import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Progress } from "@/components/ui/progress";
import { Target, Users, Building2, Award, TrendingUp, Clock } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export function PerformanceMetrics() {
  const { formatCurrency } = useOrganizationSettings();

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, department");
      const { data: contacts } = await supabase.from("contacts").select("id, company, created_at");
      const { data: deals } = await supabase.from("deals").select("id, value, stage, assigned_to, created_at");
      const { data: tickets } = await supabase.from("tickets").select("id, status, priority, created_at, resolved_at");

      const totalEmployees = profiles?.length || 0;
      const totalCustomers = contacts?.length || 0;
      const uniqueCompanies = new Set(contacts?.map(c => c.company).filter(Boolean)).size;
      
      const companyCounts: Record<string, number> = {};
      contacts?.forEach(c => { if (c.company) companyCounts[c.company] = (companyCounts[c.company] || 0) + 1; });
      const repeatCustomers = Object.values(companyCounts).filter(count => count > 1).length;
      const oneTimeCustomers = uniqueCompanies - repeatCustomers;

      const wonDeals = deals?.filter(d => d.stage === "closed_won") || [];
      const lostDeals = deals?.filter(d => d.stage === "closed_lost") || [];
      const activeDeals = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)) || [];
      const winRate = deals?.length ? (wonDeals.length / deals.length) * 100 : 0;
      const avgDealValue = wonDeals.length ? wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0) / wonDeals.length : 0;

      const resolvedTickets = tickets?.filter(t => t.status === "resolved" || t.status === "closed") || [];
      const ticketResolutionRate = tickets?.length ? (resolvedTickets.length / tickets.length) * 100 : 0;

      const radarData = [
        { metric: "Win Rate", value: winRate, fullMark: 100 },
        { metric: "Resolution Rate", value: ticketResolutionRate, fullMark: 100 },
        { metric: "Customer Retention", value: repeatCustomers > 0 ? (repeatCustomers / uniqueCompanies) * 100 : 0, fullMark: 100 },
        { metric: "Pipeline Velocity", value: Math.min((activeDeals.length / 10) * 100, 100), fullMark: 100 },
      ];

      return {
        totalEmployees, totalCustomers, uniqueCompanies, repeatCustomers, oneTimeCustomers,
        wonDealsCount: wonDeals.length, lostDealsCount: lostDeals.length, activeDealsCount: activeDeals.length,
        winRate, avgDealValue, ticketResolutionRate, resolvedTicketsCount: resolvedTickets.length, totalTickets: tickets?.length || 0,
        radarData,
        customerBreakdown: [{ name: "Regular", value: repeatCustomers }, { name: "One-time", value: oneTimeCustomers }],
        dealStageBreakdown: [{ name: "Won", value: wonDeals.length }, { name: "Active", value: activeDeals.length }, { name: "Lost", value: lostDeals.length }],
      };
    },
  });

  if (isLoading) return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => (<Card key={i} className="glass"><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>))}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle><Users className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{performanceData?.totalEmployees}</div><p className="text-xs text-muted-foreground mt-1">Team members</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle><Building2 className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{performanceData?.uniqueCompanies}</div><p className="text-xs text-muted-foreground mt-1">{performanceData?.repeatCustomers} regular · {performanceData?.oneTimeCustomers} one-time</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deal Win Rate</CardTitle><Target className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{performanceData?.winRate?.toFixed(1)}%</div><p className="text-xs text-muted-foreground mt-1">{performanceData?.wonDealsCount} won · {performanceData?.lostDealsCount} lost</p><Progress value={performanceData?.winRate || 0} className="mt-2" /></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Deal Value</CardTitle><Award className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{formatCurrency(performanceData?.avgDealValue || 0)}</div><p className="text-xs text-muted-foreground mt-1">Per closed deal</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass border-border lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Performance Overview</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData?.radarData}><PolarGrid className="stroke-muted" /><PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} /><Radar name="Performance" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} /></RadarChart></ResponsiveContainer></div></CardContent></Card>
        <div className="space-y-6">
          <Card className="glass border-border"><CardHeader><CardTitle className="text-sm">Customer Distribution</CardTitle></CardHeader><CardContent><div className="h-[120px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={performanceData?.customerBreakdown} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="value">{performanceData?.customerBreakdown.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></CardContent></Card>
          <Card className="glass border-border"><CardHeader><CardTitle className="text-sm">Deal Pipeline</CardTitle></CardHeader><CardContent><div className="h-[120px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={performanceData?.dealStageBreakdown} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="value">{performanceData?.dealStageBreakdown.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></CardContent></Card>
        </div>
      </div>

      <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Support Performance</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3"><div className="text-center p-4 rounded-lg bg-muted/30"><div className="text-3xl font-bold text-foreground">{performanceData?.totalTickets}</div><p className="text-sm text-muted-foreground">Total Tickets</p></div><div className="text-center p-4 rounded-lg bg-muted/30"><div className="text-3xl font-bold text-primary">{performanceData?.resolvedTicketsCount}</div><p className="text-sm text-muted-foreground">Resolved</p></div><div className="text-center p-4 rounded-lg bg-muted/30"><div className="text-3xl font-bold text-primary">{performanceData?.ticketResolutionRate?.toFixed(1)}%</div><p className="text-sm text-muted-foreground">Resolution Rate</p></div></div></CardContent></Card>
    </div>
  );
}
