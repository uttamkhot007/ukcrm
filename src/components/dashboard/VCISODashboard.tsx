import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  FileCheck,
  Bug,
  Lock,
  Eye,
  Activity,
  Server
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export function VCISODashboard() {
  const { currentTenant } = useTenant();
  const { insights, isLoading: aiLoading, fetchInsights } = useExecutiveInsights();

  const { data: securityData } = useQuery({
    queryKey: ["vciso-security-data", currentTenant?.id],
    queryFn: async () => {
      // Get compliance frameworks
      const { data: frameworks } = await supabase
        .from("compliance_frameworks")
        .select("*, compliance_controls(*)")
        .eq("tenant_id", currentTenant?.id);

      // Get support tickets (for security incidents)
      const { data: tickets } = await supabase
        .from("customer_support_tickets")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      // Get IT tickets
      const { data: itTickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", currentTenant?.id);

      return { frameworks, tickets, itTickets };
    },
    enabled: !!currentTenant?.id,
  });

  const frameworks = securityData?.frameworks || [];
  const tickets = securityData?.tickets || [];
  const itTickets = securityData?.itTickets || [];

  // Calculate compliance metrics
  const totalControls = frameworks.reduce(
    (sum, f) => sum + (f.compliance_controls?.length || 0), 0
  );
  const compliantControls = frameworks.reduce(
    (sum, f) => sum + (f.compliance_controls?.filter((c: any) => c.status === "compliant").length || 0), 0
  );
  const nonCompliantControls = frameworks.reduce(
    (sum, f) => sum + (f.compliance_controls?.filter((c: any) => c.status === "non_compliant").length || 0), 0
  );
  const inProgressControls = totalControls - compliantControls - nonCompliantControls;

  const complianceScore = totalControls > 0 
    ? Math.round((compliantControls / totalControls) * 100) 
    : 0;

  // Security incidents from tickets
  const securityIncidents = tickets.filter(t => 
    t.issue_type?.toLowerCase().includes("security") ||
    t.title?.toLowerCase().includes("security") ||
    t.severity === "critical"
  );
  
  const openIncidents = securityIncidents.filter(t => 
    !["resolved", "closed"].includes(t.status)
  ).length;

  const criticalTickets = tickets.filter(t => t.severity === "critical").length;
  const highTickets = tickets.filter(t => t.severity === "high").length;

  // IT Security metrics
  const securityITTickets = itTickets.filter(t => 
    t.category === "security_alert" || 
    t.title?.toLowerCase().includes("security") ||
    t.title?.toLowerCase().includes("access")
  );

  // Framework compliance data for radar chart
  const frameworkData = frameworks.map(f => {
    const controls = f.compliance_controls || [];
    const compliant = controls.filter((c: any) => c.status === "compliant").length;
    const score = controls.length > 0 ? Math.round((compliant / controls.length) * 100) : 0;
    return {
      framework: f.name.substring(0, 10),
      score,
      fullMark: 100,
    };
  });

  // Severity distribution
  const severityData = [
    { name: "Critical", value: criticalTickets, color: "hsl(var(--destructive))" },
    { name: "High", value: highTickets, color: "hsl(var(--chart-4))" },
    { name: "Medium", value: tickets.filter(t => t.severity === "medium").length, color: "hsl(var(--chart-3))" },
    { name: "Low", value: tickets.filter(t => t.severity === "low").length, color: "hsl(var(--chart-2))" },
  ].filter(d => d.value > 0);

  // Control status for bar chart
  const controlStatusData = [
    { status: "Compliant", count: compliantControls, fill: "hsl(var(--chart-2))" },
    { status: "In Progress", count: inProgressControls, fill: "hsl(var(--chart-4))" },
    { status: "Non-Compliant", count: nonCompliantControls, fill: "hsl(var(--destructive))" },
  ];

  // Security posture indicators
  const securityPosture = [
    { name: "Access Control", score: 85 },
    { name: "Data Protection", score: 78 },
    { name: "Network Security", score: 92 },
    { name: "Incident Response", score: openIncidents > 0 ? 60 : 90 },
    { name: "Compliance", score: complianceScore },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-chart-2";
    if (score >= 60) return "text-chart-4";
    return "text-destructive";
  };

  const getRiskLevel = () => {
    if (criticalTickets > 0 || complianceScore < 50) return { level: "High", color: "destructive" };
    if (highTickets > 2 || complianceScore < 70) return { level: "Medium", color: "warning" };
    return { level: "Low", color: "default" };
  };

  const risk = getRiskLevel();

  const handleFetchInsights = () => {
    fetchInsights("vciso", {
      complianceScore,
      openIncidents,
      criticalTickets,
      nonCompliantControls,
      totalControls,
      frameworkCount: frameworks.length,
      riskLevel: risk.level,
    });
  };

  useEffect(() => {
    if (securityData && !insights && !aiLoading) {
      handleFetchInsights();
    }
  }, [securityData]);

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            vCISO Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Security posture, compliance status, and risk overview
          </p>
        </div>
        <Badge variant={risk.color as any} className="text-lg px-4 py-2">
          Risk Level: {risk.level}
        </Badge>
      </div>

      {/* Key Security Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <FileCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(complianceScore)}`}>
              {complianceScore}%
            </div>
            <Progress value={complianceScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {criticalTickets} critical, {highTickets} high
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant Controls</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliantControls}/{totalControls}</div>
            <p className="text-xs text-muted-foreground">
              {nonCompliantControls} non-compliant
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Frameworks</CardTitle>
            <Lock className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{frameworks.length}</div>
            <p className="text-xs text-muted-foreground">
              Compliance frameworks tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Framework Compliance Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Framework Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {frameworkData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={frameworkData}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis dataKey="framework" className="text-xs" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Compliance %"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.3)"
                      fillOpacity={0.6}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))" 
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No compliance frameworks configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Incident Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Incident Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
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
                  No incidents reported
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Posture & Control Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Security Posture */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Security Posture Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {securityPosture.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className={getScoreColor(item.score)}>{item.score}%</span>
                </div>
                <Progress value={item.score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Control Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Control Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={controlStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={100} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {controlStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nonCompliantControls > 0 || criticalTickets > 0 ? (
              <div className="space-y-3">
                {nonCompliantControls > 0 && (
                  <div className="flex items-center gap-2 text-sm p-2 bg-destructive/10 rounded">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>{nonCompliantControls} non-compliant controls</span>
                  </div>
                )}
                {criticalTickets > 0 && (
                  <div className="flex items-center gap-2 text-sm p-2 bg-destructive/10 rounded">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>{criticalTickets} critical severity tickets</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-chart-2">
                <CheckCircle className="h-4 w-4" />
                <span>No critical issues</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-chart-4" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inProgressControls > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-chart-4 rounded-full" />
                  <span>{inProgressControls} controls in progress</span>
                </div>
              )}
              {openIncidents > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-chart-4 rounded-full" />
                  <span>{openIncidents} incidents awaiting resolution</span>
                </div>
              )}
              {securityITTickets.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-chart-4 rounded-full" />
                  <span>{securityITTickets.length} security-related IT tickets</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Monitoring Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frameworks Monitored</span>
                <span className="font-semibold">{frameworks.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Controls</span>
                <span className="font-semibold">{totalControls}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Tickets</span>
                <span className="font-semibold">{tickets.filter(t => !["resolved", "closed"].includes(t.status)).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Security Insights */}
      <AIInsightsPanel
        insights={insights}
        isLoading={aiLoading}
        error={null}
        onRefresh={handleFetchInsights}
        title="AI Security Insights"
      />
    </div>
  );
}
