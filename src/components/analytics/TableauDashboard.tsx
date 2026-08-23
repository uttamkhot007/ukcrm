import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, subMonths, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter, Treemap, FunnelChart, Funnel, LabelList
} from "recharts";
import {
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign, Users, Target,
  BarChart3, PieChartIcon, LineChartIcon, Activity, Building2, Briefcase,
  Calendar, Clock, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  Filter, Download, RefreshCw, Maximize2, Layers, GitBranch, Award,
  UserCheck, FileText, Receipt, CreditCard, Wallet, ArrowRight
} from "lucide-react";

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--destructive))',
];

interface TableauDashboardProps {
  role: 'management' | 'hr' | 'accounts' | 'finance';
}

export function TableauDashboard({ role }: TableauDashboardProps) {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d': return { start: subDays(now, 7), end: now };
      case '30d': return { start: subDays(now, 30), end: now };
      case '90d': return { start: subDays(now, 90), end: now };
      case 'ytd': return { start: startOfYear(now), end: now };
      default: return { start: subDays(now, 30), end: now };
    }
  };

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['tableau-dashboard', role, timeRange, currentTenant?.id],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      // Fetch all relevant data based on role
      const [
        { data: deals },
        { data: invoices },
        { data: profiles },
        { data: tickets },
        { data: workflows },
        { data: expenses },
        { data: contacts },
        { data: attendance }
      ] = await Promise.all([
        supabase.from('deals').select('*').gte('created_at', start.toISOString()),
        supabase.from('invoices').select('*').gte('created_at', start.toISOString()),
        supabase.from('profiles').select('*'),
        supabase.from('tickets').select('*').gte('created_at', start.toISOString()),
        supabase.from('hr_workflows').select('*').gte('created_at', start.toISOString()),
        supabase.from('expense_reports').select('*').gte('created_at', start.toISOString()),
        supabase.from('contacts').select('*').gte('created_at', start.toISOString()),
        supabase.from('attendance').select('*').gte('created_at', start.toISOString()),
      ]);

      // Calculate metrics based on role
      const totalRevenue = deals?.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + (d.value || 0), 0) || 0;
      const pipelineValue = deals?.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0) || 0;
      const wonDeals = deals?.filter(d => d.stage === 'closed_won').length || 0;
      const lostDeals = deals?.filter(d => d.stage === 'closed_lost').length || 0;
      const activeDeals = deals?.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length || 0;
      const winRate = (wonDeals + lostDeals) > 0 ? (wonDeals / (wonDeals + lostDeals)) * 100 : 0;

      const totalInvoiced = invoices?.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0) || 0;
      const paidInvoices = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0) || 0;
      const pendingInvoices = invoices?.filter(i => i.status === 'sent' || i.status === 'draft').reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0) || 0;
      const overdueInvoices = invoices?.filter(i => i.status === 'overdue').reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0) || 0;

      const totalEmployees = profiles?.length || 0;
      const activeEmployees = profiles?.filter(p => p.employment_status !== 'inactive' && p.employment_status !== 'terminated').length || 0;
      
      const totalTickets = tickets?.length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0;
      const openTickets = tickets?.filter(t => !['resolved', 'closed'].includes(t.status || '')).length || 0;

      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
      const pendingExpenses = expenses?.filter(e => e.status === 'pending' || e.status === 'submitted').reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;

      // Calculate monthly trends
      const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthDeals = deals?.filter(d => {
          const createdAt = new Date(d.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }) || [];
        
        const monthInvoices = invoices?.filter(i => {
          const createdAt = new Date(i.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }) || [];

        return {
          month: format(date, 'MMM'),
          fullMonth: format(date, 'MMMM yyyy'),
          revenue: monthDeals.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + (d.value || 0), 0),
          pipeline: monthDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0),
          invoiced: monthInvoices.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0),
          collected: monthInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0),
          deals: monthDeals.length,
          won: monthDeals.filter(d => d.stage === 'closed_won').length,
        };
      });

      // MEDDIC Pipeline stages
      const dealStages = [
        { name: 'Pipeline', value: deals?.filter(d => d.stage === 'pipeline').length || 0, fill: CHART_COLORS[0] },
        { name: 'Qualified', value: deals?.filter(d => d.stage === 'qualified').length || 0, fill: CHART_COLORS[1] },
        { name: 'Proposal', value: deals?.filter(d => d.stage === 'proposal').length || 0, fill: CHART_COLORS[2] },
        { name: 'Negotiation', value: deals?.filter(d => d.stage === 'negotiation').length || 0, fill: CHART_COLORS[3] },
        { name: 'Won', value: wonDeals, fill: CHART_COLORS[4] },
      ];

      // Department breakdown
      const departmentData = profiles?.reduce((acc: Record<string, number>, p) => {
        const dept = p.department || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}) || {};

      const departmentBreakdown = Object.entries(departmentData).map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }));

      // Invoice status distribution
      const invoiceStatusData = [
        { name: 'Paid', value: invoices?.filter(i => i.status === 'paid').length || 0, amount: paidInvoices, fill: CHART_COLORS[0] },
        { name: 'Pending', value: invoices?.filter(i => i.status === 'sent' || i.status === 'draft').length || 0, amount: pendingInvoices, fill: CHART_COLORS[1] },
        { name: 'Overdue', value: invoices?.filter(i => i.status === 'overdue').length || 0, amount: overdueInvoices, fill: CHART_COLORS[5] },
      ];

      // Performance radar
      const performanceData = [
        { metric: 'Win Rate', value: winRate, fullMark: 100 },
        { metric: 'Collection', value: totalInvoiced > 0 ? (paidInvoices / totalInvoiced) * 100 : 0, fullMark: 100 },
        { metric: 'Resolution', value: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0, fullMark: 100 },
        { metric: 'Velocity', value: Math.min((activeDeals / 10) * 100, 100), fullMark: 100 },
        { metric: 'Retention', value: 85, fullMark: 100 }, // Placeholder
      ];

      return {
        kpis: {
          totalRevenue, pipelineValue, wonDeals, lostDeals, activeDeals, winRate,
          totalInvoiced, paidInvoices, pendingInvoices, overdueInvoices,
          totalEmployees, activeEmployees,
          totalTickets, resolvedTickets, openTickets,
          totalExpenses, pendingExpenses,
          newContacts: contacts?.length || 0,
          avgAttendance: attendance?.length ? (attendance.filter(a => a.check_in).length / attendance.length) * 100 : 0,
          activeWorkflows: workflows?.filter(w => w.status === 'active').length || 0,
        },
        monthlyTrends,
        dealStages,
        departmentBreakdown,
        invoiceStatusData,
        performanceData,
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
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass">
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-3 w-20" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass"><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <LayoutDashboard className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground capitalize">{role} Analytics Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive business intelligence and KPI tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[140px] bg-background">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpis?.totalRevenue || 0)}
          subtitle="From closed deals"
          icon={DollarSign}
          trend={{ value: 12.5, positive: true }}
          color="primary"
        />
        <KPICard
          title="Pipeline Value"
          value={formatCurrency(kpis?.pipelineValue || 0)}
          subtitle={`${kpis?.activeDeals || 0} active deals`}
          icon={BarChart3}
          trend={{ value: 8.2, positive: true }}
          color="chart-2"
        />
        <KPICard
          title="Win Rate"
          value={`${(kpis?.winRate || 0).toFixed(1)}%`}
          subtitle={`${kpis?.wonDeals || 0} won / ${kpis?.lostDeals || 0} lost`}
          icon={Target}
          trend={{ value: 3.1, positive: true }}
          color="chart-3"
        />
        <KPICard
          title="Collection Rate"
          value={`${kpis?.totalInvoiced ? ((kpis.paidInvoices / kpis.totalInvoiced) * 100).toFixed(1) : 0}%`}
          subtitle={formatCurrency(kpis?.paidInvoices || 0) + ' collected'}
          icon={CheckCircle}
          trend={{ value: 5.4, positive: true }}
          color="chart-4"
        />
      </div>

      {/* Alert Cards */}
      {(kpis?.overdueInvoices || 0) > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Overdue Invoices Alert</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(kpis?.overdueInvoices || 0)} in overdue invoices require attention
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm">View Details <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Revenue & Pipeline Trend
                </CardTitle>
                <CardDescription>Monthly performance over the last 6 months</CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Activity className="h-3 w-3" /> Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dashboardData?.monthlyTrends}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', color: 'hsl(var(--popover-foreground))',}}
                    formatter={(value: number, name: string) => {
                      if (name === 'deals' || name === 'won') return [value, name.charAt(0).toUpperCase() + name.slice(1)];
                      return [formatCurrency(value), name.charAt(0).toUpperCase() + name.slice(1)];
                    }}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue"
                    stroke="hsl(var(--primary))" 
                    fill="url(#revenueGradient)" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="pipeline" 
                    name="Pipeline"
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="won" 
                    name="Won Deals"
                    fill="hsl(var(--chart-4))" 
                    radius={[4, 4, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* MEDDIC Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              MEDDIC Pipeline
            </CardTitle>
            <CardDescription>Deal progression through MEDDIC stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
                  />
                  <Funnel
                    dataKey="value"
                    data={dashboardData?.dealStages}
                    isAnimationActive
                  >
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Overall organizational performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dashboardData?.performanceData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar 
                    name="Performance" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Invoice Status
            </CardTitle>
            <CardDescription>Current invoice distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData?.invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dashboardData?.invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
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

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Team Distribution
            </CardTitle>
            <CardDescription>Employees by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData?.departmentBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
                  />
                  <Bar dataKey="value" name="Employees" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Employees"
          value={kpis?.totalEmployees || 0}
          icon={Users}
        />
        <StatCard
          label="Active Workflows"
          value={kpis?.activeWorkflows || 0}
          icon={GitBranch}
        />
        <StatCard
          label="Open Tickets"
          value={kpis?.openTickets || 0}
          icon={FileText}
        />
        <StatCard
          label="Resolved Tickets"
          value={kpis?.resolvedTickets || 0}
          icon={CheckCircle}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(kpis?.totalExpenses || 0)}
          icon={Wallet}
        />
        <StatCard
          label="Pending Expenses"
          value={formatCurrency(kpis?.pendingExpenses || 0)}
          icon={Clock}
        />
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
  color: string;
}

function KPICard({ title, value, subtitle, icon: Icon, trend, color }: KPICardProps) {
  return (
    <Card className={`border-l-4 border-l-${color} hover:shadow-lg transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && (
            <div className={`flex items-center text-xs ${trend.positive ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
              {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card className="glass">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
