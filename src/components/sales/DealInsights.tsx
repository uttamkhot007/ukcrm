import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Brain, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, 
  Lightbulb, Target, Shield, ArrowRight
} from "lucide-react";

interface DealAnalysis {
  win_probability: number;
  recommendations: string[];
  next_best_actions: string[];
  risk_factors: string[];
  deal_health: 'healthy' | 'at_risk' | 'critical';
  summary: string;
}

export function DealInsights() {
  const queryClient = useQueryClient();
  const [analyzingDealId, setAnalyzingDealId] = useState<string | null>(null);

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals-with-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(name, company, email)
        `)
        .not('stage', 'in', '(closed_won,closed_lost)')
        .order('value', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const analyzeDeal = useMutation({
    mutationFn: async (deal: any) => {
      setAnalyzingDealId(deal.id);
      
      // Fetch activities for the deal
      const { data: activities } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('deal_id', deal.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error } = await supabase.functions.invoke('sales-ai-insights', {
        body: { action: 'analyze_deal', data: { deal, activities } }
      });
      
      if (error) throw error;
      return data as DealAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals-with-insights'] });
      toast.success("Deal analyzed successfully");
    },
    onError: (error) => {
      toast.error("Failed to analyze deal: " + error.message);
    },
    onSettled: () => {
      setAnalyzingDealId(null);
    }
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500 bg-green-500/10';
      case 'at_risk': return 'text-yellow-500 bg-yellow-500/10';
      case 'critical': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getWinProbColor = (prob: number) => {
    if (prob >= 70) return 'text-green-500';
    if (prob >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  const totalPipeline = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
  const weightedPipeline = deals?.reduce((sum, d) => sum + (d.value || 0) * ((d.win_probability || 50) / 100), 0) || 0;
  const healthyDeals = deals?.filter(d => d.risk_factors?.length === 0 || !d.risk_factors) || [];
  const atRiskDeals = deals?.filter(d => d.risk_factors?.length > 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Deal Insights
          </h2>
          <p className="text-muted-foreground">AI-powered deal analysis and recommendations</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pipeline</p>
                <p className="text-2xl font-bold">${(totalPipeline / 1000).toFixed(0)}K</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weighted Pipeline</p>
                <p className="text-2xl font-bold text-green-500">${(weightedPipeline / 1000).toFixed(0)}K</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy Deals</p>
                <p className="text-2xl font-bold text-green-500">{healthyDeals.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-yellow-500">{atRiskDeals.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deals List */}
      <div className="space-y-4">
        {deals?.map((deal) => {
          const winProb = deal.win_probability || 50;
          const recommendations = deal.ai_recommendations as string[] | null;
          const nextActions = deal.next_best_actions as string[] | null;
          const riskFactors = deal.risk_factors as string[] | null;

          return (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{deal.title}</h3>
                      <Badge variant="outline">{deal.stage}</Badge>
                      {riskFactors && riskFactors.length > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {riskFactors.length} Risk{riskFactors.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {deal.contact?.company || 'Unknown Company'} • ${deal.value?.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${getWinProbColor(winProb)}`}>{winProb}%</p>
                      <p className="text-xs text-muted-foreground">Win Probability</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => analyzeDeal.mutate(deal)}
                      disabled={analyzingDealId === deal.id}
                    >
                      {analyzingDealId === deal.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-1" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Progress value={winProb} className="h-2 mb-4" />

                {(recommendations || nextActions || riskFactors) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {nextActions && nextActions.length > 0 && (
                      <div className="bg-green-500/5 rounded-lg p-3">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-2 text-green-700 dark:text-green-400">
                          <ArrowRight className="h-4 w-4" />
                          Next Best Actions
                        </h4>
                        <ul className="space-y-1">
                          {nextActions.slice(0, 3).map((action, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-green-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendations && recommendations.length > 0 && (
                      <div className="bg-blue-500/5 rounded-lg p-3">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-2 text-blue-600">
                          <Lightbulb className="h-4 w-4" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {riskFactors && riskFactors.length > 0 && (
                      <div className="bg-red-500/5 rounded-lg p-3">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-2 text-red-600">
                          <Shield className="h-4 w-4" />
                          Risk Factors
                        </h4>
                        <ul className="space-y-1">
                          {riskFactors.slice(0, 3).map((risk, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-red-500">•</span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {deal.last_analyzed_at && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last analyzed: {new Date(deal.last_analyzed_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
