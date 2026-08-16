import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Users, 
  Download,
  Loader2,
  Calendar
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { exportToCSV } from "@/lib/csv-export";
import type { Database } from "@/integrations/supabase/types";

type DealStage = Database["public"]["Enums"]["deal_stage"];

const stageLabels: Record<DealStage, string> = {
  pipeline: "Pipeline",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  upside: "Upside",
  strong_upside: "Strong Upside",
  commit: "Commit",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#22d3ee", "#ef4444"];

export function SalesReports() {
  const [period, setPeriod] = useState("6months");
  
  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["leads-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalDeals = deals?.length || 0;
  const totalValue = deals?.reduce((sum, d) => sum + Number(d.value), 0) || 0;
  const wonDeals = deals?.filter(d => d.stage === "closed_won") || [];
  const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const lostDeals = deals?.filter(d => d.stage === "closed_lost") || [];
  const winRate = totalDeals > 0 ? ((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) || 0 : 0;
  const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

  // Stage distribution data
  const stageData = Object.entries(stageLabels).map(([stage, label]) => ({
    name: label,
    value: deals?.filter(d => d.stage === stage).length || 0,
    amount: deals?.filter(d => d.stage === stage).reduce((sum, d) => sum + Number(d.value), 0) || 0,
  })).filter(d => d.value > 0);

  // Monthly trend data
  const getMonthlyData = () => {
    const months = parseInt(period.replace("months", ""));
    const endDate = new Date();
    const startDate = subMonths(endDate, months - 1);
    
    const monthsRange = eachMonthOfInterval({ start: startDate, end: endDate });
    
    return monthsRange.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthDeals = deals?.filter(d => {
        const createdAt = new Date(d.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }) || [];
      
      const monthWon = deals?.filter(d => {
        if (d.stage !== "closed_won" || !d.actual_close_date) return false;
        const closeDate = new Date(d.actual_close_date);
        return closeDate >= monthStart && closeDate <= monthEnd;
      }) || [];
      
      const monthLeads = leads?.filter(l => {
        const createdAt = new Date(l.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }) || [];

      return {
        month: format(month, "MMM"),
        deals: monthDeals.length,
        won: monthWon.length,
        leads: monthLeads.length,
        revenue: monthWon.reduce((sum, d) => sum + Number(d.value), 0),
      };
    });
  };

  const monthlyData = getMonthlyData();

  const handleExportReport = () => {
    if (!deals?.length) return;
    exportToCSV(deals, "sales-report", [
      { key: "title", label: "Deal Title" },
      { key: "value", label: "Value", transform: (v) => String(v) },
      { key: "stage", label: "Stage", transform: (v) => stageLabels[v as DealStage] || String(v) },
      { key: "probability", label: "Probability (%)", transform: (v) => String(v) },
      { key: "expected_close_date", label: "Expected Close", transform: (v) => v ? format(new Date(v as string), "yyyy-MM-dd") : "" },
      { key: "actual_close_date", label: "Actual Close", transform: (v) => v ? format(new Date(v as string), "yyyy-MM-dd") : "" },
      { key: "created_at", label: "Created", transform: (v) => format(new Date(v as string), "yyyy-MM-dd") },
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales Reports</h2>
          <p className="text-muted-foreground">Analyze your sales performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pipeline</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Won Revenue</p>
              <p className="text-2xl font-bold">${wonValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Deal Size</p>
              <p className="text-2xl font-bold">${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card className="p-6 glass border-border">
            <h3 className="font-semibold mb-4">Monthly Trends</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px", color: 'hsl(var(--popover-foreground))',}}
                />
                <Legend />
                <Line type="monotone" dataKey="deals" stroke="#3b82f6" strokeWidth={2} name="New Deals" />
                <Line type="monotone" dataKey="leads" stroke="#f59e0b" strokeWidth={2} name="New Leads" />
                <Line type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} name="Won Deals" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 glass border-border">
              <h3 className="font-semibold mb-4">Deals by Stage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px", color: 'hsl(var(--popover-foreground))',}}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 glass border-border">
              <h3 className="font-semibold mb-4">Pipeline Value by Stage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px", color: 'hsl(var(--popover-foreground))',}}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <Card className="p-6 glass border-border">
            <h3 className="font-semibold mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px", color: 'hsl(var(--popover-foreground))',}}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
