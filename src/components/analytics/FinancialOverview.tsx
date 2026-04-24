import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { ArrowUpRight, TrendingUp, DollarSign, Receipt, Target, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--success))'];

export function FinancialOverview() {
  const { formatCurrency } = useOrganizationSettings();

  const { data: financialData, isLoading } = useQuery({
    queryKey: ["financial-overview"],
    queryFn: async () => {
      const now = new Date();
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(now, 11 - i);
        return { month: format(date, "MMM yy"), start: startOfMonth(date).toISOString(), end: endOfMonth(date).toISOString() };
      });

      const { data: invoices } = await supabase.from("invoices").select("total, status, due_date, created_at").gte("created_at", last12Months[0].start);
      const { data: deals } = await supabase.from("deals").select("value, stage, expected_close_date, created_at");

      const monthlyData = last12Months.map(({ month, start, end }) => {
        const monthInvoices = invoices?.filter((inv) => inv.created_at >= start && inv.created_at <= end) || [];
        const inflow = monthInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        return { month, inflow: inflow / 1000, outflow: 0, net: inflow / 1000 };
      });

      const totalInflow = invoices?.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
      const pendingReceivables = invoices?.filter((inv) => inv.status === "sent" || inv.status === "overdue").reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
      const pipelineValue = deals?.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 0;
      const wonDealsValue = deals?.filter((d) => d.stage === "closed_won").reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 0;

      const target = totalInflow * 1.2 || 100000;
      const achievement = totalInflow > 0 ? (totalInflow / target) * 100 : 0;

      return { monthlyData, totalInflow, totalOutflow: 0, netCashflow: totalInflow, pendingReceivables, pipelineValue, wonDealsValue, target, achievement: Math.min(achievement, 100) };
    },
  });

  if (isLoading) return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => (<Card key={i} className="glass"><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-3 w-20" /></CardContent></Card>))}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Inflow</CardTitle><ArrowUpRight className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{formatCurrency(financialData?.totalInflow || 0)}</div><p className="text-xs text-muted-foreground mt-1">Last 12 months</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Cashflow</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{formatCurrency(financialData?.netCashflow || 0)}</div><p className="text-xs text-muted-foreground mt-1">Revenue</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Receivables</CardTitle><AlertTriangle className="h-4 w-4 text-warning" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{formatCurrency(financialData?.pendingReceivables || 0)}</div><p className="text-xs text-muted-foreground mt-1">Outstanding invoices</p></CardContent></Card>
        <Card className="glass border-border"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle><DollarSign className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{formatCurrency(financialData?.pipelineValue || 0)}</div><p className="text-xs text-muted-foreground mt-1">Active deals</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Target vs Achievement</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Annual Target</span><span className="font-semibold">{formatCurrency(financialData?.target || 0)}</span></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Achieved</span><span className="font-semibold text-primary">{formatCurrency(financialData?.totalInflow || 0)}</span></div><div className="w-full bg-muted rounded-full h-4 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500" style={{ width: `${financialData?.achievement || 0}%` }} /></div><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Progress</span><span className="font-semibold text-primary">{financialData?.achievement?.toFixed(1)}%</span></div></div></CardContent></Card>
        <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Pipeline & Won Deals</CardTitle></CardHeader><CardContent><div className="h-[180px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Won', value: financialData?.wonDealsValue || 0 }, { name: 'Pipeline', value: financialData?.pipelineValue || 0 }]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">{[0, 1].map((index) => (<Cell key={`cell-${index}`} fill={COLORS[index]} />))}</Pie><Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>
      </div>

      <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />Revenue Trend (Last 12 Months)</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={financialData?.monthlyData}><defs><linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}K`} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${formatCurrency(value * 1000)}`, 'Revenue']} /><Area type="monotone" dataKey="inflow" name="Revenue" stroke="hsl(var(--primary))" fill="url(#inflowGradient)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
    </div>
  );
}
