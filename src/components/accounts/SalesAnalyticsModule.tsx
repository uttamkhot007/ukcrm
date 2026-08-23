import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, parseISO } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Target,
  DollarSign,
  Loader2,
  Sparkles,
  Brain,
  AlertTriangle,
  CheckCircle,
  Calendar,
  PieChart,
  Globe,
  Package,
  Truck,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart as RechartsLine,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { useTenant } from "@/contexts/TenantContext";

type ViewType = "oem" | "month" | "account-manager" | "team" | "region" | "distributor" | "customer";
type TimePeriod = "month" | "quarter" | "year";

interface AIInsight {
  type: 'prediction' | 'recommendation' | 'alert' | 'achievement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metric?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(217, 91%, 60%)',
  'hsl(48, 96%, 53%)',
  'hsl(280, 87%, 65%)',
  'hsl(14, 100%, 57%)',
  'hsl(173, 58%, 39%)',
  'hsl(326, 100%, 74%)',
];

const SALES_TEAMS = [
  { id: "bfsi", label: "BFSI", color: "bg-blue-500" },
  { id: "international", label: "International", color: "bg-purple-500" },
  { id: "enterprise", label: "Enterprise", color: "bg-green-500" },
  { id: "commercial", label: "Commercial", color: "bg-orange-500" },
  { id: "government", label: "Government", color: "bg-red-500" },
  { id: "sme", label: "SME", color: "bg-cyan-500" },
];

const REGIONS = [
  { id: "north", label: "North" },
  { id: "south", label: "South" },
  { id: "east", label: "East" },
  { id: "west", label: "West" },
  { id: "central", label: "Central" },
  { id: "international", label: "International" },
];

export function SalesAnalyticsModule() {
  const [activeView, setActiveView] = useState<ViewType>("month");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("quarter");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const { currentTenant } = useTenant();

  // Fetch deals data
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["sales-analytics-deals", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          contact:contacts(name, company)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for account managers
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, sales_sub_team, department");

      if (error) return [];
      return data || [];
    },
  });

  // Fetch sales targets
  const { data: salesTargets = [] } = useQuery({
    queryKey: ["sales-targets", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_targets")
        .select("*");

      if (error) return [];
      return data || [];
    },
  });

  // Fetch OEMs/Offerings
  const { data: offerings = [] } = useQuery({
    queryKey: ["offerings-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offerings" as any)
        .select("id, name, vendor_name, category");

      if (error) return [];
      return (data as unknown as { id: string; name: string; vendor_name: string; category: string }[]) || [];
    },
  });

  // Fetch organizations (customers/distributors)
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("*");

      if (error) return [];
      return data || [];
    },
  });

  // Calculate date range based on time period
  const getDateRange = () => {
    const now = new Date();
    const year = parseInt(selectedYear);
    
    switch (timePeriod) {
      case "month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case "quarter":
        return {
          start: startOfQuarter(now),
          end: endOfQuarter(now),
        };
      case "year":
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31),
        };
    }
  };

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const closedWonDeals = deals.filter(d => d.stage === "closed_won");
    const totalRevenue = closedWonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalDeals = deals.length;
    const wonDeals = closedWonDeals.length;
    const lostDeals = deals.filter(d => d.stage === "closed_lost").length;
    const winRate = totalDeals > 0 ? Math.round((wonDeals / (wonDeals + lostDeals || 1)) * 100) : 0;
    const avgDealSize = wonDeals > 0 ? totalRevenue / wonDeals : 0;
    const pipelineValue = deals
      .filter(d => !["closed_won", "closed_lost"].includes(d.stage || ""))
      .reduce((sum, d) => sum + (d.value || 0), 0);

    // Monthly data
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthDeals = closedWonDeals.filter(d => {
        const date = d.actual_close_date ? parseISO(d.actual_close_date) : null;
        return date && date.getMonth() === i && date.getFullYear() === parseInt(selectedYear);
      });
      return {
        month: format(new Date(2024, i), "MMM"),
        revenue: monthDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        deals: monthDeals.length,
        target: 1000000, // Default target
      };
    });

    // By Team
    const teamData = SALES_TEAMS.map(team => {
      const teamDeals = closedWonDeals.filter(d => {
        const profile = profiles.find(p => p.user_id === d.assigned_to);
        return profile?.sales_sub_team?.toLowerCase() === team.id.toLowerCase();
      });
      return {
        name: team.label,
        revenue: teamDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        deals: teamDeals.length,
        target: 2000000,
      };
    });

    // By Region
    const regionData = REGIONS.map(region => {
      const regionDeals = closedWonDeals.filter(d => {
        const org = organizations.find(o => o.id === d.alliance_organization_id);
        return org?.address?.toLowerCase().includes(region.id.toLowerCase());
      });
      return {
        name: region.label,
        revenue: regionDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        deals: regionDeals.length,
      };
    });

    // By Account Manager
    const managerMap = new Map<string, { name: string; revenue: number; deals: number; target: number }>();
    closedWonDeals.forEach(deal => {
      const profile = profiles.find(p => p.user_id === deal.assigned_to);
      const managerName = profile?.full_name || "Unassigned";
      const current = managerMap.get(managerName) || { name: managerName, revenue: 0, deals: 0, target: 1500000 };
      current.revenue += deal.value || 0;
      current.deals += 1;
      managerMap.set(managerName, current);
    });
    const managerData = Array.from(managerMap.values()).sort((a, b) => b.revenue - a.revenue);

    // By OEM
    const oemData = offerings.slice(0, 10).map(offering => {
      const offeringDeals = closedWonDeals.filter(d => d.solution_id === offering.id);
      return {
        name: offering.name || "Unknown",
        revenue: offeringDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        deals: offeringDeals.length,
      };
    });

    // By Customer
    const customerMap = new Map<string, { name: string; revenue: number; deals: number }>();
    closedWonDeals.forEach(deal => {
      const customerName = deal.contact?.company || deal.organization_name || "Unknown";
      const current = customerMap.get(customerName) || { name: customerName, revenue: 0, deals: 0 };
      current.revenue += deal.value || 0;
      current.deals += 1;
      customerMap.set(customerName, current);
    });
    const customerData = Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // By Distributor
    const distributorData = organizations
      .filter(o => o.organization_type === "distributor")
      .map(dist => {
        const distDeals = closedWonDeals.filter(d => d.alliance_organization_id === dist.id);
        return {
          name: dist.name,
          revenue: distDeals.reduce((sum, d) => sum + (d.value || 0), 0),
          deals: distDeals.length,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue,
      totalDeals,
      wonDeals,
      lostDeals,
      winRate,
      avgDealSize,
      pipelineValue,
      monthlyData,
      teamData,
      regionData,
      managerData,
      oemData,
      customerData,
      distributorData,
    };
  }, [deals, organizations, offerings, profiles, selectedYear]);

  // Fetch AI insights
  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke("executive-insights", {
        body: {
          role: "vcfo",
          context: {
            salesData: {
              totalRevenue: analyticsData.totalRevenue,
              totalDeals: analyticsData.totalDeals,
              winRate: analyticsData.winRate,
              avgDealSize: analyticsData.avgDealSize,
              pipelineValue: analyticsData.pipelineValue,
              monthlyTrends: analyticsData.monthlyData,
              teamPerformance: analyticsData.teamData,
              topCustomers: analyticsData.customerData.slice(0, 5),
            },
          },
          customPrompt: `Analyze the sales analytics data and provide:
1. Key performance insights
2. Revenue growth predictions
3. Team performance recommendations
4. Risk alerts for underperforming areas
5. Target vs achievement analysis
Focus on actionable insights for sales management.`,
        },
      });

      if (error) throw error;

      const insights: AIInsight[] = [];
      if (data?.predictions?.length) {
        data.predictions.forEach((p: string) => {
          insights.push({ type: 'prediction', title: 'Revenue Forecast', description: p, priority: 'medium' });
        });
      }
      if (data?.recommendations?.length) {
        data.recommendations.forEach((r: string) => {
          insights.push({ type: 'recommendation', title: 'Action Required', description: r, priority: 'high' });
        });
      }
      if (data?.risks?.length) {
        data.risks.forEach((r: string) => {
          insights.push({ type: 'alert', title: 'Risk Alert', description: r, priority: 'high' });
        });
      }
      setAiInsights(insights);
    } catch (error: any) {
      toast.error("Failed to generate AI insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const getAchievementColor = (achieved: number, target: number) => {
    const percentage = (achieved / target) * 100;
    if (percentage >= 100) return "text-green-500";
    if (percentage >= 75) return "text-yellow-500";
    return "text-red-500";
  };

  if (dealsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-muted-foreground">Comprehensive sales performance analysis with AI-powered insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">Full Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="w-5 h-5 text-green-700 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(analyticsData.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-xl font-bold">{formatCurrency(analyticsData.pipelineValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deals</p>
                <p className="text-xl font-bold">{analyticsData.totalDeals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Won Deals</p>
                <p className="text-xl font-bold">{analyticsData.wonDeals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold">{analyticsData.winRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <LineChart className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                <p className="text-xl font-bold">{formatCurrency(analyticsData.avgDealSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">AI Sales Intelligence</CardTitle>
              <CardDescription>AI-powered predictions and recommendations for sales optimization</CardDescription>
            </div>
          </div>
          <Button onClick={fetchAIInsights} disabled={loadingInsights}>
            {loadingInsights ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Insights
          </Button>
        </CardHeader>
        {aiInsights.length > 0 && (
          <CardContent>
            <ScrollArea className="h-[180px]">
              <div className="space-y-3">
                {aiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      insight.type === 'alert' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                      insight.type === 'recommendation' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' :
                      insight.type === 'achievement' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                      'border-purple-200 bg-purple-50 dark:bg-purple-950/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {insight.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />}
                      {insight.type === 'recommendation' && <Target className="w-4 h-4 text-blue-500 mt-0.5" />}
                      {insight.type === 'prediction' && <TrendingUp className="w-4 h-4 text-purple-500 mt-0.5" />}
                      {insight.type === 'achievement' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                      <div>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)} className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="month" className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">By Month</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">By Team</span>
          </TabsTrigger>
          <TabsTrigger value="account-manager" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">By AM</span>
          </TabsTrigger>
          <TabsTrigger value="oem" className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">By OEM</span>
          </TabsTrigger>
          <TabsTrigger value="region" className="flex items-center gap-1">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">By Region</span>
          </TabsTrigger>
          <TabsTrigger value="customer" className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">By Customer</span>
          </TabsTrigger>
          <TabsTrigger value="distributor" className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">By Distributor</span>
          </TabsTrigger>
        </TabsList>

        {/* By Month View */}
        <TabsContent value="month" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Monthly Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="target" stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Target vs Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name="Target" />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Achieved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Month</th>
                      <th className="text-right p-2">Target</th>
                      <th className="text-right p-2">Achieved</th>
                      <th className="text-right p-2">Deals</th>
                      <th className="text-right p-2">Achievement %</th>
                      <th className="text-left p-2">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.monthlyData.map((month, idx) => {
                      const achievement = month.target > 0 ? (month.revenue / month.target) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{month.month}</td>
                          <td className="text-right p-2">{formatCurrency(month.target)}</td>
                          <td className="text-right p-2">{formatCurrency(month.revenue)}</td>
                          <td className="text-right p-2">{month.deals}</td>
                          <td className={`text-right p-2 font-medium ${getAchievementColor(month.revenue, month.target)}`}>
                            {achievement.toFixed(1)}%
                          </td>
                          <td className="p-2 w-32">
                            <Progress value={Math.min(achievement, 100)} className="h-2" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Team View */}
        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Sales by Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.teamData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name="Target" />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Achieved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Revenue Distribution by Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={analyticsData.teamData.filter(t => t.revenue > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {analyticsData.teamData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Team Performance Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SALES_TEAMS.map((team, idx) => {
              const teamStats = analyticsData.teamData.find(t => t.name === team.label) || { revenue: 0, deals: 0, target: 2000000 };
              const achievement = teamStats.target > 0 ? (teamStats.revenue / teamStats.target) * 100 : 0;
              return (
                <Card key={team.id}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={team.color}>{team.label}</Badge>
                        {achievement >= 100 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(teamStats.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{teamStats.deals} deals</p>
                      <Progress value={Math.min(achievement, 100)} className="h-1" />
                      <p className={`text-xs font-medium ${getAchievementColor(teamStats.revenue, teamStats.target)}`}>
                        {achievement.toFixed(1)}% of target
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* By Account Manager View */}
        <TabsContent value="account-manager" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Top Account Managers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.managerData.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Manager Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {analyticsData.managerData.slice(0, 10).map((manager, idx) => {
                      const achievement = manager.target > 0 ? (manager.revenue / manager.target) * 100 : 0;
                      return (
                        <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{manager.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatCurrency(manager.revenue)}</span>
                              <span>{manager.deals} deals</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${getAchievementColor(manager.revenue, manager.target)}`}>
                              {achievement.toFixed(1)}%
                            </p>
                            <Progress value={Math.min(achievement, 100)} className="h-1 w-20" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By OEM View */}
        <TabsContent value="oem" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Sales by OEM/Vendor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.oemData.filter(o => o.revenue > 0)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))">
                      {analyticsData.oemData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  OEM Revenue Share
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={analyticsData.oemData.filter(o => o.revenue > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => percent > 0.05 ? `${name.slice(0, 10)}... ${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {analyticsData.oemData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Region View */}
        <TabsContent value="region" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Sales by Region
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.regionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))">
                      {analyticsData.regionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {analyticsData.regionData.map((region, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium">{region.name}</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(region.revenue)}</p>
                      <p className="text-sm text-muted-foreground">{region.deals} deals</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Customer View */}
        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Top Customers by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.customerData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={150} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))">
                      {analyticsData.customerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {analyticsData.customerData.map((customer, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.deals} deals</p>
                        </div>
                        <p className="font-bold">{formatCurrency(customer.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Distributor View */}
        <TabsContent value="distributor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Sales by Distributor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.distributorData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))">
                      {analyticsData.distributorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {analyticsData.distributorData.length > 0 ? (
                      analyticsData.distributorData.map((dist, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{dist.name}</p>
                            <p className="text-sm text-muted-foreground">{dist.deals} deals</p>
                          </div>
                          <p className="font-bold">{formatCurrency(dist.revenue)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No distributor data available
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
