import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, DollarSign, Users, BarChart3, Target, Shield,
  Lightbulb, AlertCircle, ArrowUpRight, CreditCard, Loader2, RefreshCw,
  Calendar, Receipt, HeadphonesIcon, Repeat, Briefcase, Building2,
  ChevronRight, Zap, PieChart, LineChart, Mail, Lock, ShieldAlert, ShieldCheck
} from "lucide-react";

interface AccountAnalysis {
  executiveSummary: string;
  accountHealth: {
    score: number;
    trend: "improving" | "stable" | "declining";
    factors: string[];
  };
  businessContribution: {
    totalLifetimeValue: number;
    averageDealSize: number;
    growthTrend: string;
    contributionRank: string;
  };
  paymentPatterns: {
    payerType: "prompt" | "regular" | "delayed" | "problematic";
    averageDelayDays: number;
    riskLevel: "low" | "medium" | "high";
    pattern: string;
  };
  recommendations: {
    paymentTerms: {
      suggested: string;
      reasoning: string;
    };
    creditLimit: {
      suggested: string;
      reasoning: string;
    };
    pricingStrategy: string;
  };
  teamInsights: {
    sales: string[];
    accounts: string[];
    finance: string[];
    technical: string[];
  };
  predictions: {
    renewalProbability: string;
    upsellOpportunity: string;
    churnRisk: string;
    nextQuarterRevenue: string;
  };
  keyRisks: string[];
  opportunities: string[];
  metrics: {
    accountAgeYears: number;
    accountAgeDays: number;
    totalRevenue: number;
    totalDeals: number;
    wonDeals: number;
    winRate: number;
    avgPaymentDelay: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalOutstanding: number;
    totalOverdue: number;
    openTickets: number;
    criticalTickets: number;
    upcomingRenewals: number;
    renewalValue: number;
  };
}

interface AccountIntelligenceProps {
  organizationName?: string;
  organizationType?: "own" | "alliance";
  allianceOrgId?: string;
}

export function AccountIntelligence({ 
  organizationName, 
  organizationType = "own",
  allianceOrgId 
}: AccountIntelligenceProps) {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState("sales");

  // Fetch deals data
  const { data: deals = [] } = useQuery({
    queryKey: ["account-deals", currentTenant?.id, organizationName, allianceOrgId],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      let query = supabase
        .from("deals")
        .select("id, title, value, stage, created_at, actual_close_date")
        .eq("tenant_id", currentTenant.id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch invoices data
  const { data: invoices = [] } = useQuery({
    queryKey: ["account-invoices", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from("invoices")
        .select("id, total, status, due_date, amount_paid, created_at")
        .eq("tenant_id", currentTenant.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["account-contacts", currentTenant?.id, allianceOrgId],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      if (organizationType === "alliance" && allianceOrgId) {
        const { data, error } = await supabase
          .from("alliance_users")
          .select("id, name, role, status")
          .eq("organization_id", allianceOrgId);
        if (error) throw error;
        return (data || []).map(c => ({
          name: c.name,
          role: c.role,
          isChampion: false,
          engagementScore: 50
        }));
      }
      
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, role_in_deal, is_champion, engagement_score")
        .eq("tenant_id", currentTenant.id);

      if (error) throw error;
      return (data || []).map(c => ({
        name: c.name,
        role: c.role_in_deal,
        isChampion: c.is_champion || false,
        engagementScore: c.engagement_score || 0
      }));
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ["account-tickets", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, priority, created_at, resolved_at")
        .eq("tenant_id", currentTenant.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch renewals
  const { data: renewals = [] } = useQuery({
    queryKey: ["account-renewals", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from("renewals")
        .select("id, name, status, expiry_date, cost")
        .eq("tenant_id", currentTenant.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const accountData = {
        organizationName: organizationName || "Organization",
        deals: deals.map(d => ({
          title: d.title,
          value: d.value,
          stage: d.stage,
          createdAt: d.created_at,
          closedAt: d.actual_close_date
        })),
        invoices: invoices.map(i => ({
          amount: i.total,
          status: i.status,
          dueDate: i.due_date,
          paidAt: i.status === 'paid' ? i.created_at : null,
          createdAt: i.created_at
        })),
        contacts,
        tickets: tickets.map(t => ({
          status: t.status,
          priority: t.priority,
          createdAt: t.created_at,
          resolvedAt: t.resolved_at
        })),
        renewals: renewals.map(r => ({
          name: r.name,
          status: r.status,
          expiryDate: r.expiry_date,
          cost: r.cost || 0
        }))
      };

      const { data, error } = await supabase.functions.invoke('account-intelligence', {
        body: accountData
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setAnalysis(data);
      toast.success("AI analysis completed");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error("Failed to generate analysis: " + (error.message || "Unknown error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "declining": return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getPayerBadge = (type: string) => {
    switch (type) {
      case "prompt": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Prompt Payer</Badge>;
      case "regular": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Regular Payer</Badge>;
      case "delayed": return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Delayed Payer</Badge>;
      default: return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Problematic Payer</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low": return <Badge className="bg-green-500/10 text-green-600">Low Risk</Badge>;
      case "medium": return <Badge className="bg-yellow-500/10 text-yellow-600">Medium Risk</Badge>;
      default: return <Badge className="bg-red-500/10 text-red-600">High Risk</Badge>;
    }
  };

  if (!analysis) {
    return (
      <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary to-primary/60 p-4 rounded-2xl">
              <Brain className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">AI Account Intelligence</h3>
            <p className="text-muted-foreground max-w-md">
              Get AI-powered insights about this account including business contribution, 
              payment patterns, predictions, and actionable recommendations for all teams.
            </p>
          </div>
          <Button 
            onClick={runAnalysis} 
            disabled={isAnalyzing}
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Account...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-primary/60 p-2 rounded-lg">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">AI Account Intelligence</h3>
            <p className="text-sm text-muted-foreground">Powered by advanced analytics</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 p-2 bg-primary/10 rounded-lg">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Executive Summary</h4>
              <p className="text-muted-foreground leading-relaxed">{analysis.executiveSummary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Account Health */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Account Health</span>
              {getTrendIcon(analysis.accountHealth.trend)}
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${getHealthColor(analysis.accountHealth.score)}`}>
                {analysis.accountHealth.score}
              </span>
              <span className="text-muted-foreground mb-1">/100</span>
            </div>
            <Progress value={analysis.accountHealth.score} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-2 capitalize">{analysis.accountHealth.trend} trend</p>
          </CardContent>
        </Card>

        {/* Account Age */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Account Tenure</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{analysis.metrics.accountAgeYears}</span>
              <span className="text-muted-foreground mb-1">years</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{analysis.metrics.accountAgeDays} days active</p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Lifetime Value</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(analysis.metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {analysis.metrics.wonDeals} won deals • {analysis.metrics.winRate}% win rate
            </p>
          </CardContent>
        </Card>

        {/* Payment Health */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Payment Status</span>
              {getRiskBadge(analysis.paymentPatterns.riskLevel)}
            </div>
            <div className="flex items-center gap-2">
              {getPayerBadge(analysis.paymentPatterns.payerType)}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Avg delay: {analysis.paymentPatterns.averageDelayDays} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Contribution */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Business Contribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total LTV</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(analysis.businessContribution.totalLifetimeValue)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(analysis.businessContribution.averageDealSize)}
                </p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Growth Trend</span>
                <span className="font-medium">{analysis.businessContribution.growthTrend}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contribution Rank</span>
                <span className="font-medium">{analysis.businessContribution.contributionRank}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Patterns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Payment Patterns</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{analysis.paymentPatterns.pattern}</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-lg font-semibold text-green-600">{analysis.metrics.paidInvoices}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-lg font-semibold text-yellow-600">{analysis.metrics.pendingInvoices}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <p className="text-lg font-semibold text-red-600">{analysis.metrics.overdueInvoices}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-medium text-yellow-600">
                {formatCurrency(analysis.metrics.totalOutstanding)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">AI Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-primary/5 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Suggested Payment Terms</span>
                <Badge variant="secondary">{analysis.recommendations.paymentTerms.suggested}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{analysis.recommendations.paymentTerms.reasoning}</p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Credit Limit</span>
                <Badge variant="secondary">{analysis.recommendations.creditLimit.suggested}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{analysis.recommendations.creditLimit.reasoning}</p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg space-y-1">
              <span className="text-sm font-medium">Pricing Strategy</span>
              <p className="text-xs text-muted-foreground">{analysis.recommendations.pricingStrategy}</p>
            </div>
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">AI Predictions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Renewal Probability</span>
              </div>
              <span className="text-sm font-medium">{analysis.predictions.renewalProbability}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                <span className="text-sm">Upsell Opportunity</span>
              </div>
              <span className="text-sm font-medium truncate max-w-[50%]">{analysis.predictions.upsellOpportunity}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Churn Risk</span>
              </div>
              <span className="text-sm font-medium">{analysis.predictions.churnRisk}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Next Quarter Revenue</span>
              </div>
              <span className="text-sm font-medium">{analysis.predictions.nextQuarterRevenue}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Insights */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Team-Specific Insights</CardTitle>
          </div>
          <CardDescription>Actionable recommendations for each team</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sales" className="gap-1">
                <Briefcase className="w-3 h-3" />
                Sales
              </TabsTrigger>
              <TabsTrigger value="accounts" className="gap-1">
                <CreditCard className="w-3 h-3" />
                Accounts
              </TabsTrigger>
              <TabsTrigger value="finance" className="gap-1">
                <DollarSign className="w-3 h-3" />
                Finance
              </TabsTrigger>
              <TabsTrigger value="technical" className="gap-1">
                <HeadphonesIcon className="w-3 h-3" />
                Technical
              </TabsTrigger>
            </TabsList>
            {Object.entries(analysis.teamInsights).map(([team, insights]) => (
              <TabsContent key={team} value={team} className="mt-4">
                <ScrollArea className="h-[200px]">
                  <ul className="space-y-2">
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Email Security Intelligence */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Email Security Intelligence
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">AI Powered</Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Security posture analysis for email communications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Email Authentication */}
            <div className="p-3 bg-background/80 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-500" />
                  Authentication Status
                </span>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Configured</Badge>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>SPF Record</span>
                  <span className="flex items-center gap-1 text-green-600"><ShieldCheck className="w-3 h-3" /> Valid</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>DKIM Signing</span>
                  <span className="flex items-center gap-1 text-green-600"><ShieldCheck className="w-3 h-3" /> Active</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>DMARC Policy</span>
                  <span className="flex items-center gap-1 text-yellow-600"><ShieldAlert className="w-3 h-3" /> Quarantine</span>
                </div>
              </div>
            </div>

            {/* Email Gateway */}
            <div className="p-3 bg-background/80 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  Gateway Security
                </span>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Active</Badge>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Anti-Spam</span>
                  <span className="text-green-600">Enabled</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Anti-Phishing</span>
                  <span className="text-green-600">Enabled</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Attachment Scanning</span>
                  <span className="text-green-600">Sandboxed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Recommendations */}
          <div className="p-3 bg-background/80 rounded-lg border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Security Recommendations
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Upgrade DMARC policy from "quarantine" to "reject" for stronger email impersonation protection</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Enable BIMI (Brand Indicators for Message Identification) to display verified logo in recipient inboxes</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Consider implementing MTA-STS for encrypted email transport</span>
              </li>
            </ul>
          </div>

          {/* Threat Statistics */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 bg-background/80 rounded-lg border text-center">
              <p className="text-2xl font-bold text-green-500">98.5%</p>
              <p className="text-xs text-muted-foreground">Spam Blocked</p>
            </div>
            <div className="p-3 bg-background/80 rounded-lg border text-center">
              <p className="text-2xl font-bold text-blue-500">147</p>
              <p className="text-xs text-muted-foreground">Phishing Attempts Blocked (30d)</p>
            </div>
            <div className="p-3 bg-background/80 rounded-lg border text-center">
              <p className="text-2xl font-bold text-amber-500">12</p>
              <p className="text-xs text-muted-foreground">Malware Quarantined (30d)</p>
            </div>
          </div>
        </CardContent>
      </Card>


      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <CardTitle className="text-base">Key Risks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.keyRisks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <CardTitle className="text-base">Growth Opportunities</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.opportunities.map((opportunity, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{opportunity}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
