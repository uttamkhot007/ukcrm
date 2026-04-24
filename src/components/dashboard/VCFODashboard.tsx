import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Receipt, 
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

export function VCFODashboard() {
  const { currentTenant } = useTenant();
  const { insights, isLoading: aiLoading, fetchInsights } = useExecutiveInsights();

  const { data: financialData } = useQuery({
    queryKey: ["vcfo-financial-data", currentTenant?.id],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      // Get deals for revenue data
      const { data: deals } = await supabase
        .from("deals")
        .select("value, stage, created_at, actual_close_date")
        .eq("tenant_id", currentTenant?.id);

      // Get invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      // Get expense reports
      const { data: expenses } = await supabase
        .from("expense_reports")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      return { deals, invoices, expenses };
    },
    enabled: !!currentTenant?.id,
  });

  const deals = financialData?.deals || [];
  const invoices = financialData?.invoices || [];
  const expenses = financialData?.expenses || [];

  // Calculate metrics
  const totalRevenue = deals
    .filter(d => d.stage === "closed_won")
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const pipelineValue = deals
    .filter(d => !["closed_won", "closed_lost"].includes(d.stage))
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const totalInvoiced = invoices.reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);
  const paidInvoices = invoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);
  const pendingInvoices = invoices
    .filter(i => i.status === "sent" || i.status === "draft")
    .reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);
  const overdueInvoices = invoices
    .filter(i => i.status === "overdue")
    .reduce((sum, i) => sum + ((i.subtotal || 0) + (i.tax_amount || 0)), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  const pendingExpenses = expenses
    .filter(e => e.status === "pending" || e.status === "submitted")
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const totalProcurement = 0;

  // Monthly revenue trend
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const revenue = deals
      .filter(d => {
        if (d.stage !== "closed_won" || !d.actual_close_date) return false;
        const closeDate = new Date(d.actual_close_date);
        return closeDate >= monthStart && closeDate <= monthEnd;
      })
      .reduce((sum, d) => sum + (d.value || 0), 0);

    return {
      month: format(date, "MMM"),
      revenue: revenue,
    };
  });

  // Invoice status distribution
  const invoiceDistribution = [
    { name: "Paid", value: paidInvoices, color: "hsl(var(--chart-2))" },
    { name: "Pending", value: pendingInvoices, color: "hsl(var(--chart-4))" },
    { name: "Overdue", value: overdueInvoices, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  // Cash flow projection (simplified)
  const cashFlowData = monthlyRevenue.map((m, i) => ({
    ...m,
    expenses: totalExpenses / 6,
    net: m.revenue - totalExpenses / 6,
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const collectionRate = totalInvoiced > 0 ? (paidInvoices / totalInvoiced) * 100 : 0;

  const handleFetchInsights = () => {
    fetchInsights("vcfo", {
      totalRevenue,
      pipelineValue,
      pendingInvoices,
      overdueInvoices,
      totalExpenses,
      collectionRate,
    });
  };

  // Auto-fetch insights on initial load when data is ready
  useEffect(() => {
    if (financialData && !insights && !aiLoading) {
      handleFetchInsights();
    }
  }, [financialData]);

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            vCFO Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Financial health overview and cash flow insights
          </p>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From closed deals</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
            <p className="text-xs text-muted-foreground">Active opportunities</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
            <Receipt className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingInvoices)}</div>
            <p className="text-xs text-muted-foreground">Pending collection</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(overdueInvoices)}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {invoiceDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={invoiceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {invoiceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))" 
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No invoice data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Indicators */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-chart-2" />
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">{collectionRate.toFixed(1)}%</div>
            <Progress value={collectionRate} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {formatCurrency(paidInvoices)} collected of {formatCurrency(totalInvoiced)} invoiced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-chart-4" />
              Expense Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Expenses</span>
              <span className="font-semibold">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Approval</span>
              <span className="font-semibold text-chart-4">{formatCurrency(pendingExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Procurement</span>
              <span className="font-semibold">{formatCurrency(totalProcurement)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Quick Ratios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue/Expense</span>
              <span className="font-semibold">
                {totalExpenses > 0 ? (totalRevenue / totalExpenses).toFixed(2) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pipeline Coverage</span>
              <span className="font-semibold">
                {totalRevenue > 0 ? ((pipelineValue / totalRevenue) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AR Days Outstanding</span>
              <span className="font-semibold">
                {invoices.length > 0 ? Math.round(pendingInvoices / (totalRevenue / 365)) : 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights & Cash Flow */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AIInsightsPanel
          insights={insights}
          isLoading={aiLoading}
          error={null}
          onRefresh={handleFetchInsights}
          title="AI Financial Insights"
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cash Flow Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
