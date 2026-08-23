import { chartTooltipProps } from "@/lib/chart-theme";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay, differenceInHours } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, 
  Users, Zap, Target, Brain, ArrowUp, ArrowDown 
} from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function TicketAnalytics() {
  const { currentTenant } = useTenant();
  const [timeRange, setTimeRange] = useState("7");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets-analytics", currentTenant?.id, timeRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(timeRange));
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", currentTenant?.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate metrics
  const totalTickets = tickets.length;
  const resolvedTickets = tickets.filter(t => ["resolved", "closed"].includes(t.status));
  const openTickets = tickets.filter(t => !["resolved", "closed"].includes(t.status));
  
  const avgResolutionTime = resolvedTickets.length > 0
    ? Math.round(resolvedTickets.reduce((acc, t) => {
        if (t.resolved_at) {
          return acc + differenceInHours(new Date(t.resolved_at), new Date(t.created_at));
        }
        return acc;
      }, 0) / resolvedTickets.length)
    : 0;

  const slaBreached = tickets.filter(t => 
    t.sla_deadline && new Date(t.sla_deadline) < new Date() && !["resolved", "closed"].includes(t.status)
  ).length;

  const slaCompliance = totalTickets > 0 
    ? Math.round(((totalTickets - slaBreached) / totalTickets) * 100) 
    : 100;

  // Chart data
  const ticketsByDay = Array.from({ length: parseInt(timeRange) }, (_, i) => {
    const date = subDays(new Date(), parseInt(timeRange) - 1 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const dayTickets = tickets.filter(t => {
      const created = new Date(t.created_at);
      return created >= dayStart && created <= dayEnd;
    });
    const resolved = dayTickets.filter(t => ["resolved", "closed"].includes(t.status)).length;
    return {
      date: format(date, "MMM d"),
      created: dayTickets.length,
      resolved,
    };
  });

  const ticketsByPriority = [
    { name: "Low", value: tickets.filter(t => t.priority === "low").length },
    { name: "Medium", value: tickets.filter(t => t.priority === "medium").length },
    { name: "High", value: tickets.filter(t => t.priority === "high").length },
    { name: "Critical", value: tickets.filter(t => t.priority === "critical").length },
  ].filter(d => d.value > 0);

  const ticketsByCategory = [
    { name: "Incident", value: tickets.filter(t => t.category === "incident").length },
    { name: "Service Request", value: tickets.filter(t => t.category === "service_request").length },
    { name: "Change Request", value: tickets.filter(t => t.category === "change_request").length },
    { name: "Problem", value: tickets.filter(t => t.category === "problem").length },
  ].filter(d => d.value > 0);

  const ticketsByStatus = [
    { name: "Open", value: tickets.filter(t => t.status === "open").length },
    { name: "In Progress", value: tickets.filter(t => t.status === "in_progress").length },
    { name: "Pending", value: tickets.filter(t => t.status === "pending_customer" || t.status === "pending_vendor").length },
    { name: "Escalated", value: tickets.filter(t => t.status === "escalated").length },
    { name: "Resolved", value: tickets.filter(t => t.status === "resolved" || t.status === "closed").length },
  ].filter(d => d.value > 0);

  // AI Insights (mock for now - would integrate with Lovable AI)
  const insights = [
    {
      type: "trend",
      icon: TrendingUp,
      title: "Ticket Volume Trending Up",
      description: "15% increase in tickets compared to last period. Consider allocating more resources.",
      severity: "warning",
    },
    {
      type: "sla",
      icon: Clock,
      title: "SLA Performance",
      description: slaCompliance >= 90 
        ? "Excellent SLA compliance! Keep up the good work." 
        : "SLA compliance needs attention. Review critical tickets.",
      severity: slaCompliance >= 90 ? "success" : "error",
    },
    {
      type: "category",
      icon: Target,
      title: "Top Issue Category",
      description: ticketsByCategory.length > 0 
        ? `${ticketsByCategory[0]?.name} tickets are most common. Consider creating FAQs or automation.`
        : "No significant patterns detected.",
      severity: "info",
    },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Ticket Analytics & Insights
          </h2>
          <p className="text-sm text-muted-foreground">AI-powered analytics and trends</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{totalTickets}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{openTickets.length}</p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-full">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{resolvedTickets.length}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold">{avgResolutionTime}h</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Compliance</p>
                <p className={`text-2xl font-bold ${slaCompliance >= 90 ? "text-green-700 dark:text-green-400" : slaCompliance >= 70 ? "text-amber-600" : "text-red-600"}`}>
                  {slaCompliance}%
                </p>
              </div>
              <div className={`p-2 rounded-full ${slaCompliance >= 90 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                <Target className={`h-5 w-5 ${slaCompliance >= 90 ? "text-green-500" : "text-red-500"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border ${
                  insight.severity === "success" ? "bg-green-500/5 border-green-500/20" :
                  insight.severity === "warning" ? "bg-amber-500/5 border-amber-500/20" :
                  insight.severity === "error" ? "bg-red-500/5 border-red-500/20" :
                  "bg-blue-500/5 border-blue-500/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <insight.icon className={`h-4 w-4 ${
                    insight.severity === "success" ? "text-green-500" :
                    insight.severity === "warning" ? "text-amber-500" :
                    insight.severity === "error" ? "text-red-500" :
                    "text-blue-500"
                  }`} />
                  <span className="font-medium text-sm">{insight.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Trend</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Trend</CardTitle>
              <CardDescription>Created vs Resolved tickets over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ticketsByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip {...chartTooltipProps} />
                    <Legend />
                    <Area type="monotone" dataKey="created" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Created" />
                    <Area type="monotone" dataKey="resolved" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Resolved" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>By Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ticketsByPriority}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {ticketsByPriority.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...chartTooltipProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ticketsByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {ticketsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...chartTooltipProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                      <Tooltip {...chartTooltipProps} />
                      <Bar dataKey="value" fill="#3b82f6" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Resolution metrics and SLA tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Resolution Rate</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-green-500 h-full transition-all" 
                        style={{ width: `${totalTickets > 0 ? (resolvedTickets.length / totalTickets) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="font-bold">
                      {totalTickets > 0 ? Math.round((resolvedTickets.length / totalTickets) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">SLA Compliance</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${slaCompliance >= 90 ? "bg-green-500" : slaCompliance >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${slaCompliance}%` }}
                      />
                    </div>
                    <span className="font-bold">{slaCompliance}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
