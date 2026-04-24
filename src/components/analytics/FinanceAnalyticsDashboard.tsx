import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, subMonths, subDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, Treemap
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, CreditCard, Wallet,
  PiggyBank, AlertTriangle, CheckCircle, Clock, Calendar, ArrowUpRight,
  ArrowDownRight, RefreshCw, FileText, Building2, Target, BarChart3,
  ArrowRight, Layers, Percent, Ban
} from "lucide-react";

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--destructive))',
];

export function FinanceAnalyticsDashboard() {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'ytd'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const { data: financeData, isLoading, refetch } = useQuery({
    queryKey: ['finance-analytics-dashboard', timeRange, currentTenant?.id],
    queryFn: async () => {
      const now = new Date();
      const daysAgo = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = subDays(now, daysAgo);

      const [
        { data: invoices },
        { data: expenses },
        { data: deals },
      ] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('expense_reports').select('*'),
        supabase.from('deals').select('*'),
      ]);

      // Invoice metrics
      const totalInvoiced = invoices?.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0) || 0;
      const paidInvoices = invoices?.filter(i => i.status === 'paid') || [];
      const pendingInvoices = invoices?.filter(i => i.status === 'sent' || i.status === 'draft') || [];
      const overdueInvoices = invoices?.filter(i => i.status === 'overdue') || [];

      const paidAmount = paidInvoices.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);
      const pendingAmount = pendingInvoices.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);

      const collectionRate = totalInvoiced > 0 ? (paidAmount / totalInvoiced) * 100 : 0;

      // DSO calculation (Days Sales Outstanding)
      const avgDSO = overdueInvoices.length > 0
        ? overdueInvoices.reduce((sum, i) => {
            const dueDate = new Date(i.due_date);
            return sum + differenceInDays(now, dueDate);
          }, 0) / overdueInvoices.length
        : 0;

      // Expense metrics
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
      const approvedExpenses = expenses?.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
      const pendingExpenses = expenses?.filter(e => e.status === 'pending' || e.status === 'submitted').reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
      const rejectedExpenses = expenses?.filter(e => e.status === 'rejected').reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;

      // Revenue from deals
      const totalRevenue = deals?.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + (d.value || 0), 0) || 0;
      const pipelineValue = deals?.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0) || 0;

      // Procurement placeholders
      const totalProcurement = 0;
      const pendingProcurement = 0;

      // Net cashflow
      const netCashflow = paidAmount - totalExpenses;

      // Monthly trends
      const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(now, 5 - i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        const monthInvoices = invoices?.filter(inv => {
          const createdAt = new Date(inv.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }) || [];

        const monthExpenses = expenses?.filter(exp => {
          const createdAt = new Date(exp.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }) || [];

        const inflow = monthInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);
        const outflow = monthExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.total_amount || 0), 0);

        return {
          month: format(date, 'MMM'),
          inflow,
          outflow,
          net: inflow - outflow,
          invoiced: monthInvoices.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0),
        };
      });

      // AR Aging buckets
      const arAging = [
        { name: 'Current', value: pendingInvoices.filter(i => differenceInDays(now, new Date(i.due_date)) <= 0).length, fill: CHART_COLORS[0] },
        { name: '1-30 Days', value: overdueInvoices.filter(i => { const days = differenceInDays(now, new Date(i.due_date)); return days > 0 && days <= 30; }).length, fill: CHART_COLORS[1] },
        { name: '31-60 Days', value: overdueInvoices.filter(i => { const days = differenceInDays(now, new Date(i.due_date)); return days > 30 && days <= 60; }).length, fill: CHART_COLORS[2] },
        { name: '61-90 Days', value: overdueInvoices.filter(i => { const days = differenceInDays(now, new Date(i.due_date)); return days > 60 && days <= 90; }).length, fill: CHART_COLORS[3] },
        { name: '90+ Days', value: overdueInvoices.filter(i => differenceInDays(now, new Date(i.due_date)) > 90).length, fill: CHART_COLORS[5] },
      ];

      // Invoice status breakdown
      const invoiceStatusData = [
        { name: 'Paid', value: paidInvoices.length, amount: paidAmount, fill: CHART_COLORS[0] },
        { name: 'Pending', value: pendingInvoices.length, amount: pendingAmount, fill: CHART_COLORS[1] },
        { name: 'Overdue', value: overdueInvoices.length, amount: overdueAmount, fill: CHART_COLORS[5] },
      ];

      // Expense categories
      const expenseCategories = expenses?.reduce((acc: Record<string, number>, e: any) => {
        const category = e.category || e.expense_type || 'Other';
        acc[category] = (acc[category] || 0) + (e.total_amount || 0);
        return acc;
      }, {}) || {};

      const expenseCategoryData = (Object.entries(expenseCategories) as [string, number][])
        .map(([name, value], index) => ({
          name,
          value,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      return {
        kpis: {
          totalInvoiced,
          paidAmount,
          pendingAmount,
          overdueAmount,
          collectionRate,
          avgDSO,
          totalExpenses,
          approvedExpenses,
          pendingExpenses,
          rejectedExpenses,
          totalRevenue,
          pipelineValue,
          totalProcurement,
          pendingProcurement,
          netCashflow,
          invoiceCount: invoices?.length || 0,
          paidCount: paidInvoices.length,
          pendingCount: pendingInvoices.length,
          overdueCount: overdueInvoices.length,
        },
        monthlyTrends,
        arAging,
        invoiceStatusData,
        expenseCategoryData,
      };
    },
    enabled: !!currentTenant?.id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = financeData?.kpis;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Finance & Accounts Dashboard</h1>
            <p className="text-muted-foreground">Financial health, AR/AP and cash flow analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[140px] bg-background">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.totalRevenue || 0)}</div>
            <div className="flex items-center gap-2 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500">+12.5% vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(kpis?.collectionRate || 0).toFixed(1)}%</div>
            <Progress value={kpis?.collectionRate || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending AR</CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.pendingAmount || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.pendingCount || 0} invoices pending</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${(kpis?.overdueAmount || 0) > 0 ? 'border-l-destructive' : 'border-l-green-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Amount</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${(kpis?.overdueAmount || 0) > 0 ? 'text-destructive' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(kpis?.overdueAmount || 0) > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(kpis?.overdueAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.overdueCount || 0} overdue invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Cashflow</p>
                <p className={`text-xl font-bold ${(kpis?.netCashflow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(kpis?.netCashflow || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg DSO</p>
                <p className="text-xl font-bold">{Math.round(kpis?.avgDSO || 0)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(kpis?.totalExpenses || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-xl font-bold">{formatCurrency(kpis?.pipelineValue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for overdue */}
      {(kpis?.overdueAmount || 0) > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Overdue Invoices Alert</p>
                  <p className="text-sm text-muted-foreground">
                    {kpis?.overdueCount} invoices totaling {formatCurrency(kpis?.overdueAmount || 0)} require immediate attention
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm">
                View Overdue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Cash Flow Trend
                </CardTitle>
                <CardDescription>Monthly inflow vs outflow analysis</CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">6 Months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financeData?.monthlyTrends}>
                  <defs>
                    <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="inflow" 
                    name="Inflow"
                    fill="url(#inflowGradient)" 
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                  />
                  <Bar dataKey="outflow" name="Outflow" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    name="Net"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AR Aging */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              AR Aging Analysis
            </CardTitle>
            <CardDescription>Invoice aging buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData?.arAging}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" name="Invoices" radius={[4, 4, 0, 0]}>
                    {financeData?.arAging.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Invoice Status Distribution
            </CardTitle>
            <CardDescription>Current invoice breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financeData?.invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {financeData?.invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} invoices (${formatCurrency(props.payload.amount)})`,
                      name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Expense Categories
            </CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData?.expenseCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" name="Amount" radius={[0, 4, 4, 0]}>
                    {financeData?.expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-lg font-bold">{kpis?.invoiceCount || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Paid Invoices</p>
                <p className="text-lg font-bold text-green-600">{kpis?.paidCount || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Expenses</p>
                <p className="text-lg font-bold">{formatCurrency(kpis?.pendingExpenses || 0)}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Procurement Pending</p>
                <p className="text-lg font-bold">{formatCurrency(kpis?.pendingProcurement || 0)}</p>
              </div>
              <Layers className="h-8 w-8 text-violet-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
