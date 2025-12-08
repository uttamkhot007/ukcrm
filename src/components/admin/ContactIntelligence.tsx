import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, DollarSign, Users, BarChart3, Target, Shield,
  Lightbulb, AlertCircle, ArrowUpRight, Loader2, RefreshCw,
  Calendar, Phone, Mail, Video, Briefcase, Star, Zap, MessageSquare,
  UserCheck, ThumbsUp, ThumbsDown, Activity
} from "lucide-react";

interface ContactAnalysis {
  executiveSummary: string;
  relationshipHealth: {
    score: number;
    trend: "improving" | "stable" | "declining";
    factors: string[];
  };
  engagementMetrics: {
    totalInteractions: number;
    avgResponseTime: string;
    preferredChannel: string;
    engagementLevel: "high" | "medium" | "low";
  };
  dealInfluence: {
    totalDealsInfluenced: number;
    wonDealsInfluenced: number;
    totalValueInfluenced: number;
    avgDealSize: number;
    influenceScore: number;
  };
  communicationPatterns: {
    bestTimeToContact: string;
    preferredMeetingType: string;
    responseRate: number;
    avgMeetingDuration: string;
  };
  recommendations: {
    nextBestAction: string;
    engagementTips: string[];
    riskMitigation: string;
    relationshipGoals: string[];
  };
  predictions: {
    dealPotential: string;
    churnRisk: string;
    advocacyLikelihood: string;
    upsellReadiness: string;
  };
  keyStrengths: string[];
  areasOfConcern: string[];
  metrics: {
    daysSinceFirstContact: number;
    totalMeetings: number;
    totalCalls: number;
    totalEmails: number;
    winRate: number;
    avgDealCycleWithContact: number;
  };
}

interface ContactIntelligenceProps {
  contactId: string;
  contactName: string;
  organizationName?: string;
}

export function ContactIntelligence({ 
  contactId, 
  contactName,
  organizationName 
}: ContactIntelligenceProps) {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const [analysis, setAnalysis] = useState<ContactAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch linked contact
  const { data: linkedContact } = useQuery({
    queryKey: ["linked-contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id")
        .eq("alliance_user_id", contactId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!contactId,
  });

  // Fetch deals for this contact
  const { data: deals = [] } = useQuery({
    queryKey: ["contact-intel-deals", linkedContact?.id],
    queryFn: async () => {
      if (!linkedContact?.id) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("contact_id", linkedContact.id);
      if (error) return [];
      return data;
    },
    enabled: !!linkedContact?.id,
  });

  // Fetch meetings
  const { data: meetings = [] } = useQuery({
    queryKey: ["contact-intel-meetings", linkedContact?.id],
    queryFn: async () => {
      if (!linkedContact?.id) return [];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("related_contact_id", linkedContact.id);
      if (error) return [];
      return data;
    },
    enabled: !!linkedContact?.id,
  });

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ["contact-intel-activities", deals],
    queryFn: async () => {
      if (!deals.length) return [];
      const dealIds = deals.map(d => d.id);
      const { data, error } = await supabase
        .from("deal_activities")
        .select("*")
        .in("deal_id", dealIds);
      if (error) return [];
      return data;
    },
    enabled: deals.length > 0,
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const contactData = {
        contactName,
        organizationName: organizationName || "Unknown Organization",
        deals: deals.map(d => ({
          title: d.title,
          value: d.value,
          stage: d.stage,
          createdAt: d.created_at,
          closedAt: d.actual_close_date
        })),
        meetings: meetings.map(m => ({
          title: m.title,
          type: m.event_type,
          startTime: m.start_time,
          status: m.status,
          duration: m.end_time ? 
            Math.round((new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000) : null
        })),
        activities: activities.map(a => ({
          type: a.activity_type,
          description: a.description,
          createdAt: a.created_at
        }))
      };

      const { data, error } = await supabase.functions.invoke('contact-intelligence', {
        body: contactData
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

  const getEngagementBadge = (level: string) => {
    switch (level) {
      case "high": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">High Engagement</Badge>;
      case "medium": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Medium Engagement</Badge>;
      default: return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Low Engagement</Badge>;
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
            <h3 className="text-xl font-semibold">AI Contact Intelligence</h3>
            <p className="text-muted-foreground max-w-md">
              Get AI-powered insights about this contact including relationship health, 
              engagement patterns, deal influence, and personalized recommendations.
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
                Analyzing Contact...
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
            <h3 className="font-semibold">AI Contact Intelligence</h3>
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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Relationship Health */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Relationship</span>
              {getTrendIcon(analysis.relationshipHealth.trend)}
            </div>
            <div className="flex items-end gap-1">
              <span className={`text-2xl font-bold ${getHealthColor(analysis.relationshipHealth.score)}`}>
                {analysis.relationshipHealth.score}
              </span>
              <span className="text-muted-foreground text-sm mb-0.5">/100</span>
            </div>
            <Progress value={analysis.relationshipHealth.score} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        {/* Deal Influence */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 mb-2">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Influence</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold">{analysis.dealInfluence.influenceScore}</span>
              <span className="text-muted-foreground text-sm mb-0.5">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{analysis.dealInfluence.totalDealsInfluenced} deals</p>
          </CardContent>
        </Card>

        {/* Value Influenced */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Value</span>
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(analysis.dealInfluence.totalValueInfluenced)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.dealInfluence.wonDealsInfluenced} won
            </p>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 mb-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Engagement</span>
            </div>
            <div className="mt-1">
              {getEngagementBadge(analysis.engagementMetrics.engagementLevel)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{analysis.engagementMetrics.totalInteractions} interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Communication Patterns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Communication Patterns</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Best Time to Contact</span>
              <span className="font-medium">{analysis.communicationPatterns.bestTimeToContact}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preferred Channel</span>
              <span className="font-medium">{analysis.engagementMetrics.preferredChannel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Response Rate</span>
              <span className="font-medium">{analysis.communicationPatterns.responseRate}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Response Time</span>
              <span className="font-medium">{analysis.engagementMetrics.avgResponseTime}</span>
            </div>
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">AI Predictions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deal Potential</span>
              <Badge variant="outline">{analysis.predictions.dealPotential}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Churn Risk</span>
              <Badge variant="outline">{analysis.predictions.churnRisk}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Advocacy Likelihood</span>
              <Badge variant="outline">{analysis.predictions.advocacyLikelihood}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Upsell Readiness</span>
              <Badge variant="outline">{analysis.predictions.upsellReadiness}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Next Best Action</p>
                <p className="text-sm text-muted-foreground">{analysis.recommendations.nextBestAction}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Engagement Tips</p>
            <ul className="space-y-1">
              {analysis.recommendations.engagementTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {analysis.recommendations.riskMitigation && (
            <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Risk Mitigation</p>
                  <p className="text-sm text-muted-foreground">{analysis.recommendations.riskMitigation}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths & Concerns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-green-500" />
              <CardTitle className="text-sm">Key Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.keyStrengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm">Areas of Concern</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.areasOfConcern.map((concern, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Activity Statistics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Video className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold">{analysis.metrics.totalMeetings}</p>
              <p className="text-xs text-muted-foreground">Meetings</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Phone className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold">{analysis.metrics.totalCalls}</p>
              <p className="text-xs text-muted-foreground">Calls</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Mail className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold">{analysis.metrics.totalEmails}</p>
              <p className="text-xs text-muted-foreground">Emails</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Calendar className="w-5 h-5 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold">{analysis.metrics.daysSinceFirstContact}</p>
              <p className="text-xs text-muted-foreground">Days Known</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
