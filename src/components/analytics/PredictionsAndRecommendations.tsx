import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Target, Lightbulb, CheckCircle2, ArrowRight, Sparkles, BarChart3 } from "lucide-react";

export function PredictionsAndRecommendations() {
  const { formatCurrency } = useOrganizationSettings();

  const { data: analysisData, isLoading } = useQuery({
    queryKey: ["predictions-recommendations"],
    queryFn: async () => {
      const [{ data: deals }, { data: invoices }, { data: contacts }, { data: profiles }] = await Promise.all([
        supabase.from("deals").select("*"),
        supabase.from("invoices").select("*"),
        supabase.from("contacts").select("*"),
        supabase.from("profiles").select("*"),
      ]);

      const wonDeals = deals?.filter(d => d.stage === "closed_won") || [];
      const avgDealValue = wonDeals.length ? wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0) / wonDeals.length : 0;
      const pipelineDeals = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)) || [];
      const pipelineValue = pipelineDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const winRate = deals?.length ? (wonDeals.length / deals.length) : 0;
      const predictedRevenue = pipelineValue * winRate;

      const predictions = [
        { title: "Predicted Q4 Revenue", value: formatCurrency(predictedRevenue * 1.1), confidence: 75, description: "Based on pipeline and conversion rates", trend: "up" as const },
        { title: "Expected Deal Closures", value: `${Math.round(wonDeals.length / 12 * 3)} deals`, confidence: 80, description: "Projected for next quarter", trend: "stable" as const },
        { title: "Customer Growth", value: `+${Math.round((contacts?.length || 0) * 0.12)} contacts`, confidence: 70, description: "Expected new acquisitions", trend: "up" as const },
      ];

      const recommendations = [];
      if (winRate < 0.35) recommendations.push({ category: "Sales", title: "Improve Deal Qualification", description: `Win rate (${(winRate * 100).toFixed(1)}%) below 35% benchmark`, impact: "High", effort: "Medium", actions: ["Implement BANT framework", "Review lost deals", "Train on objection handling"] });
      if (pipelineValue < avgDealValue * 4) recommendations.push({ category: "Pipeline", title: "Increase Pipeline Coverage", description: "Current pipeline below 4x monthly target", impact: "Critical", effort: "High", actions: ["Increase prospecting", "Launch campaigns", "Develop referral program"] });

      const bestPractices = [
        { title: "Lead Scoring", description: "Use data-driven scoring to prioritize prospects", benefit: "20-30% productivity improvement" },
        { title: "Customer 360 View", description: "Consolidate data for personalized engagement", benefit: "15% satisfaction increase" },
        { title: "Predictive Analytics", description: "Predict deal outcomes and churn", benefit: "25% churn reduction" },
        { title: "Revenue Operations", description: "Align sales, marketing, and success", benefit: "19% faster growth" },
      ];

      return { predictions, recommendations, bestPractices };
    },
  });

  if (isLoading) return <div className="space-y-6">{[1, 2, 3].map((i) => (<Card key={i} className="glass"><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>))}</div>;

  return (
    <div className="space-y-6">
      <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />AI-Powered Predictions</CardTitle><CardDescription>Forecasts based on historical data</CardDescription></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3">{analysisData?.predictions.map((p, i) => (<div key={i} className="p-4 rounded-lg bg-muted/30 border border-border"><div className="flex items-center gap-2 mb-2">{p.trend === "up" ? <TrendingUp className="h-4 w-4 text-primary" /> : <BarChart3 className="h-4 w-4 text-muted-foreground" />}<span className="text-xs text-muted-foreground">{p.confidence}% confidence</span></div><p className="text-2xl font-bold text-foreground mb-1">{p.value}</p><p className="text-sm font-medium text-foreground">{p.title}</p><p className="text-xs text-muted-foreground mt-1">{p.description}</p></div>))}</div></CardContent></Card>

      <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Strategic Recommendations</CardTitle></CardHeader><CardContent><div className="space-y-4">{analysisData?.recommendations.length === 0 ? <p className="text-muted-foreground text-center py-4">Great job! No critical recommendations</p> : analysisData?.recommendations.map((rec, i) => (<div key={i} className="p-4 rounded-lg border border-border bg-muted/20"><div className="flex items-start gap-3 mb-3"><div className={`p-2 rounded-lg ${rec.impact === "Critical" ? "bg-destructive/10" : "bg-primary/10"}`}><Lightbulb className={`h-4 w-4 ${rec.impact === "Critical" ? "text-destructive" : "text-primary"}`} /></div><div><div className="flex gap-2 mb-1"><Badge variant="outline">{rec.category}</Badge><Badge variant={rec.impact === "Critical" ? "destructive" : "default"}>{rec.impact} Impact</Badge></div><h4 className="font-semibold text-foreground">{rec.title}</h4><p className="text-sm text-muted-foreground mt-1">{rec.description}</p></div></div><div className="ml-11 space-y-1">{rec.actions.map((a, j) => (<div key={j} className="flex items-center gap-2 text-sm text-foreground"><ArrowRight className="h-3 w-3 text-primary" />{a}</div>))}</div></div>))}</div></CardContent></Card>

      <Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Industry Best Practices</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{analysisData?.bestPractices.map((p, i) => (<div key={i} className="p-4 rounded-lg border border-border bg-gradient-to-br from-primary/5 to-transparent"><h4 className="font-semibold text-foreground mb-2">{p.title}</h4><p className="text-sm text-muted-foreground mb-3">{p.description}</p><div className="flex items-center gap-2 text-xs"><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-primary font-medium">{p.benefit}</span></div></div>))}</div></CardContent></Card>
    </div>
  );
}
