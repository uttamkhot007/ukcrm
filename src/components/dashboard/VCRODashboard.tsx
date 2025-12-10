import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign,
  Calendar,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
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
  Legend,
  ComposedChart,
  Line
} from "recharts";

export function VCRODashboard() {
  const { currentTenant } = useTenant();

  const { data: revenueData } = useQuery({
    queryKey: ["vcro-revenue-data", currentTenant?.id],
    queryFn: async () => {
      // Get deals
      const { data: deals } = await supabase
        .from("deals")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      // Get leads
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      // Get contacts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      // Get sales targets
      const { data: targets } = await supabase
        .from("sales_targets")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      // Get team members (sales)
      const { data: salesTeam } = await supabase
        .from("user_teams")
        .select("user_id")
        .in("team", ["sales", "inside_sales"]);

      // Get renewals
      const { data: renewals } = await supabase
        .from("renewals")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      return { deals, leads, contacts, targets, salesTeam, renewals };
    },
    enabled: !!currentTenant?.id,
  });

  const deals = revenueData?.deals || [];
  const leads = revenueData?.leads || [];
  const contacts = revenueData?.contacts || [];
  const targets = revenueData?.targets || [];
  const salesTeam = revenueData?.salesTeam || [];
  const renewals = revenueData?.renewals || [];

  // Calculate key metrics
  const closedWonDeals = deals.filter(d => d.stage === "closed_won");
  const closedLostDeals = deals.filter(d => d.stage === "closed_lost");
  const activeDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage));

  const totalRevenue = closedWonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const avgDealSize = closedWonDeals.length > 0 ? totalRevenue / closedWonDeals.length : 0;
  const winRate = (closedWonDeals.length + closedLostDeals.length) > 0
    ? (closedWonDeals.length / (closedWonDeals.length + closedLostDeals.length)) * 100
    : 0;

  // Target calculation
  const currentQuarterStart = startOfQuarter(new Date());
  const currentQuarterEnd = endOfQuarter(new Date());
  const quarterlyTarget = targets
    .filter(t => {
      const targetDate = new Date(t.period_start);
      return targetDate >= currentQuarterStart && targetDate <= currentQuarterEnd;
    })
    .reduce((sum, t) => sum + (t.top_line_target || 0), 0);
  
  const targetAttainment = quarterlyTarget > 0 ? (totalRevenue / quarterlyTarget) * 100 : 0;

  // Monthly revenue trend
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const wonDeals = deals.filter(d => {
      if (d.stage !== "closed_won" || !d.actual_close_date) return false;
      const closeDate = new Date(d.actual_close_date);
      return closeDate >= monthStart && closeDate <= monthEnd;
    });
    
    const lostDeals = deals.filter(d => {
      if (d.stage !== "closed_lost") return false;
      const closeDate = new Date(d.updated_at);
      return closeDate >= monthStart && closeDate <= monthEnd;
    });

    return {
      month: format(date, "MMM"),
      won: wonDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      lost: lostDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      deals: wonDeals.length,
    };
  });

  // Pipeline by stage
  const stages = ["qualification", "discovery", "proposal", "negotiation"];
  const pipelineByStage = stages.map(stage => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d.value || 0), 0),
    count: deals.filter(d => d.stage === stage).length,
  }));

  // Lead source distribution
  const leadSources = leads.reduce((acc: Record<string, number>, lead) => {
    const source = lead.source || "Unknown";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const leadSourceData = Object.entries(leadSources).map(([name, value], i) => ({
    name,
    value,
    color: `hsl(var(--chart-${(i % 5) + 1}))`,
  }));

  // Renewal metrics
  const activeRenewals = renewals.filter(r => r.status === "active");
  const expiringRenewals = renewals.filter(r => {
    if (r.status !== "active" || !r.expiry_date) return false;
    const expiry = new Date(r.expiry_date);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays;
  });
  const renewalValue = activeRenewals.reduce((sum, r) => sum + (r.cost || 0), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Velocity metrics
  const avgDealCycle = closedWonDeals.length > 0
    ? closedWonDeals.reduce((sum, d) => {
        if (!d.actual_close_date || !d.created_at) return sum;
        const days = Math.ceil(
          (new Date(d.actual_close_date).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / closedWonDeals.length
    : 0;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            vCRO Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Revenue performance, pipeline health, and growth metrics
          </p>
        </div>
        <Badge 
          variant={targetAttainment >= 100 ? "default" : targetAttainment >= 75 ? "secondary" : "destructive"}
          className="text-lg px-4 py-2"
        >
          {targetAttainment.toFixed(0)}% of Target
        </Badge>
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center text-xs text-chart-2 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {closedWonDeals.length} deals closed
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              {activeDeals.length} active opportunities
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <Progress value={winRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <Award className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgDealSize)}</div>
            <p className="text-xs text-muted-foreground">Per closed deal</p>
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
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === "deals" ? value : formatCurrency(value),
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="won" name="Won" fill="hsl(var(--chart-2))" />
                  <Bar yAxisId="left" dataKey="lost" name="Lost" fill="hsl(var(--destructive) / 0.5)" />
                  <Line yAxisId="right" type="monotone" dataKey="deals" name="Deals" stroke="hsl(var(--primary))" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineByStage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis dataKey="stage" type="category" width={100} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {leadSourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {leadSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
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
                  No lead data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Velocity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-chart-4" />
              Sales Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Avg Deal Cycle</span>
              <span className="font-semibold">{Math.round(avgDealCycle)} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pipeline Velocity</span>
              <span className="font-semibold">
                {formatCurrency((pipelineValue * winRate / 100) / Math.max(avgDealCycle / 30, 1))}/mo
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lead-to-Deal</span>
              <span className="font-semibold">
                {leads.length > 0 ? ((deals.length / leads.length) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sales Team Size</span>
              <span className="font-semibold">{salesTeam.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Renewals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Renewal Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Active Renewals</span>
              <span className="font-semibold">{activeRenewals.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Renewal Value</span>
              <span className="font-semibold">{formatCurrency(renewalValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-chart-4">Expiring (30 days)</span>
              <span className="font-semibold text-chart-4">{expiringRenewals.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Contacts</span>
              <span className="font-semibold">{contacts.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quarterly Target Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Current: {formatCurrency(totalRevenue)}</span>
              <span>Target: {formatCurrency(quarterlyTarget)}</span>
            </div>
            <Progress 
              value={Math.min(targetAttainment, 100)} 
              className="h-4"
            />
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold">{formatCurrency(quarterlyTarget * 0.25)}</div>
                <div className="text-muted-foreground">25%</div>
              </div>
              <div>
                <div className="font-semibold">{formatCurrency(quarterlyTarget * 0.5)}</div>
                <div className="text-muted-foreground">50%</div>
              </div>
              <div>
                <div className="font-semibold">{formatCurrency(quarterlyTarget * 0.75)}</div>
                <div className="text-muted-foreground">75%</div>
              </div>
              <div>
                <div className="font-semibold">{formatCurrency(quarterlyTarget)}</div>
                <div className="text-muted-foreground">100%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
