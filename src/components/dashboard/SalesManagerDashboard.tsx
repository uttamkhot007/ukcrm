import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target,
  BarChart3,
  Trophy,
  AlertTriangle,
  Building2,
  UserPlus,
  Calendar,
  MapPin,
  Package,
  Layers
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, subMonths } from "date-fns";
import { TeamCalendarWidget } from "./TeamCalendarWidget";
import { TeamRemindersWidget } from "./TeamRemindersWidget";

interface SalesManagerDashboardProps {
  onNavigate: (module: string) => void;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function SalesManagerDashboard({ onNavigate }: SalesManagerDashboardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch team members (profiles with sales team)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["sales-team-members", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_teams!inner(team)
        `)
        .eq("user_teams.team", "sales");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all team deals
  const { data: teamDeals = [] } = useQuery({
    queryKey: ["team-deals", currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*")
        .not("stage", "in", "(closed_won,closed_lost)");

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all customers (organizations)
  const { data: customers = [] } = useQuery({
    queryKey: ["all-customers", currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("alliance_organizations")
        .select("*")
        .eq("organization_type", "customer");

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch monthly closed deals for revenue trends (last 6 months)
  const { data: revenueTrend = [] } = useQuery({
    queryKey: ["revenue-trend", currentTenant?.id],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      let query = supabase
        .from("deals")
        .select("value, user_id, assigned_to, stage, actual_close_date, deal_type, solution_id")
        .eq("stage", "closed_won")
        .gte("actual_close_date", sixMonthsAgo.toISOString().split("T")[0]);

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch monthly stats (current month)
  const { data: monthlyStats } = useQuery({
    queryKey: ["monthly-team-stats", currentTenant?.id],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      let query = supabase
        .from("deals")
        .select("value, user_id, assigned_to, stage")
        .gte("actual_close_date", monthStart.toISOString().split("T")[0])
        .lte("actual_close_date", monthEnd.toISOString().split("T")[0]);

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const wonDeals = (data || []).filter(d => d.stage === "closed_won");
      const lostDeals = (data || []).filter(d => d.stage === "closed_lost");

      return {
        won: wonDeals.length,
        lost: lostDeals.length,
        revenue: wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
        winRate: wonDeals.length + lostDeals.length > 0 
          ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 
          : 0,
      };
    },
    enabled: !!user,
  });

  // Calculate customers added this week and this month
  const weekStart = startOfWeek(new Date());
  const monthStart = startOfMonth(new Date());
  
  const customersThisWeek = customers.filter(c => 
    new Date(c.created_at) >= weekStart
  ).length;
  
  const customersThisMonth = customers.filter(c => 
    new Date(c.created_at) >= monthStart
  ).length;

  // Group customers by industry (segment)
  const customersBySegment = customers.reduce((acc, c) => {
    const segment = c.industry || "Uncategorized";
    acc[segment] = (acc[segment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const segmentData = Object.entries(customersBySegment)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Calculate revenue by month for trend chart
  const revenueByMonth = revenueTrend.reduce((acc, deal) => {
    if (deal.actual_close_date) {
      const month = format(new Date(deal.actual_close_date), "MMM yyyy");
      acc[month] = (acc[month] || 0) + (Number(deal.value) || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const revenueTrendData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const month = format(date, "MMM yyyy");
    return {
      month: format(date, "MMM"),
      revenue: revenueByMonth[month] || 0,
    };
  });

  // Calculate revenue by team member
  const revenueByMember = revenueTrend.reduce((acc, deal) => {
    const memberId = deal.assigned_to || deal.user_id;
    acc[memberId] = (acc[memberId] || 0) + (Number(deal.value) || 0);
    return acc;
  }, {} as Record<string, number>);

  const revenueByMemberData = teamMembers
    .map(member => ({
      name: member.full_name?.split(" ")[0] || "Unknown",
      revenue: revenueByMember[member.user_id] || 0,
      target: 300000, // Individual target - could come from settings
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Calculate revenue by offering type
  const revenueByType = revenueTrend.reduce((acc, deal) => {
    const type = deal.deal_type || "Other";
    acc[type] = (acc[type] || 0) + (Number(deal.value) || 0);
    return acc;
  }, {} as Record<string, number>);

  const revenueByTypeData = Object.entries(revenueByType)
    .map(([name, value]) => ({ 
      name: name === "product" ? "Products" : 
            name === "service" ? "Managed Services" : 
            name === "subscription" ? "Subscriptions" :
            name.charAt(0).toUpperCase() + name.slice(1),
      value 
    }))
    .sort((a, b) => b.value - a.value);

  // Revenue by region (using customer address or a mock for now)
  const revenueByRegion = customers.reduce((acc, c) => {
    // Extract region from address or use a default
    const region = c.address?.split(",").pop()?.trim() || "Other";
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const regionData = Object.entries(revenueByRegion)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Calculate team performance by member
  const teamPerformance = teamMembers.map(member => {
    const memberDeals = teamDeals.filter(
      d => d.user_id === member.user_id || d.assigned_to === member.user_id
    );
    const memberRevenue = revenueByMember[member.user_id] || 0;
    const pipelineValue = memberDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const target = 300000;
    return {
      ...member,
      dealCount: memberDeals.length,
      pipelineValue,
      revenue: memberRevenue,
      target,
      achievement: (memberRevenue / target) * 100,
    };
  }).sort((a, b) => b.pipelineValue - a.pipelineValue);

  // Identify at-risk deals
  const atRiskDeals = teamDeals
    .filter(d => {
      const daysSinceUpdate = Math.floor(
        (new Date().getTime() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 14 || (Number(d.value) > 100000 && daysSinceUpdate > 7);
    })
    .slice(0, 5);

  const totalPipeline = teamDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const teamTarget = 2000000;
  const totalRevenue = revenueTrend.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const targetProgress = Math.min((monthlyStats?.revenue || 0) / teamTarget * 100, 100);

  // Chart config
  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
    target: { label: "Target", color: "hsl(var(--chart-2))" },
    value: { label: "Value", color: "hsl(var(--chart-3))" },
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Team Size</p>
                <p className="text-xl font-bold">{teamMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Customers</p>
                <p className="text-xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-200 dark:border-cyan-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New This Week</p>
                <p className="text-xl font-bold">{customersThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-200 dark:border-violet-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New This Month</p>
                <p className="text-xl font-bold">{customersThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pipeline</p>
                <p className="text-lg font-bold">{formatCurrency(totalPipeline)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold">{(monthlyStats?.winRate || 0).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Target Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Team Monthly Target - {format(new Date(), "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {formatCurrency(monthlyStats?.revenue || 0)} of {formatCurrency(teamTarget)}
              </span>
              <span className="text-sm text-muted-foreground">
                {targetProgress.toFixed(1)}% achieved
              </span>
            </div>
            <Progress value={targetProgress} className="h-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-600">{monthlyStats?.won || 0}</p>
                <p className="text-xs text-muted-foreground">Deals Won</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <p className="text-2xl font-bold text-red-600">{monthlyStats?.lost || 0}</p>
                <p className="text-xs text-muted-foreground">Deals Lost</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <p className="text-2xl font-bold text-blue-600">{teamDeals.length}</p>
                <p className="text-xs text-muted-foreground">In Pipeline</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1 - Revenue Trend & Revenue by Member */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis 
                  className="text-xs" 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Revenue vs Target by Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={revenueByMemberData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  className="text-xs"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="name" className="text-xs" width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={4} name="Revenue" />
                <Bar dataKey="target" fill="hsl(var(--chart-2))" radius={4} opacity={0.4} name="Target" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Revenue by Offerings & Segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Revenue by Offerings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {revenueByTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {revenueByTypeData.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Customers by Segment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {segmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {segmentData.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Customers by Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {regionData.map((region, index) => (
                <div key={region.name} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium truncate">{region.name}</span>
                      <span className="text-sm text-muted-foreground">{region.value}</span>
                    </div>
                    <Progress 
                      value={(region.value / customers.length) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
              {regionData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No region data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance & At-Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Individual Target vs Achievement */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Target vs Achievement by Sales Person
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[350px] overflow-y-auto">
              {teamPerformance.map((member, index) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/50"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {member.full_name?.split(" ").map(n => n[0]).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">{member.full_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(member.revenue)} / {formatCurrency(member.target)}
                        </span>
                        <Badge 
                          variant={member.achievement >= 100 ? "default" : member.achievement >= 75 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {member.achievement.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={Math.min(member.achievement, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {member.dealCount} active deals • {formatCurrency(member.pipelineValue)} pipeline
                    </p>
                  </div>
                </div>
              ))}
              {teamPerformance.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Deals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              At-Risk Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {atRiskDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 rounded-lg border-l-4 border-l-orange-500 bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate("sales")}
                >
                  <p className="font-medium text-sm truncate">{deal.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(deal.value)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {Math.floor((new Date().getTime() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24))} days idle
                    </Badge>
                  </div>
                </div>
              ))}
              {atRiskDeals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No at-risk deals
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TeamRemindersWidget />
        <div className="lg:col-span-2">
          <TeamCalendarWidget 
            teamType="sales" 
            title="Sales Team Calendar" 
          />
        </div>
      </div>
    </div>
  );
}
