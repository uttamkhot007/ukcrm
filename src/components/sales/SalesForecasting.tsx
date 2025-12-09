import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Brain, RefreshCw, TrendingUp, TrendingDown, Target, 
  Calendar, DollarSign, BarChart3, AlertCircle, CheckCircle
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface ForecastResult {
  predicted_revenue: number;
  weighted_pipeline: number;
  confidence_score: number;
  analysis: string;
  factors: {
    positive: string[];
    negative: string[];
    recommendations: string[];
  };
  risk_assessment: 'low' | 'medium' | 'high';
}

export function SalesForecasting() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: deals } = useQuery({
    queryKey: ['forecast-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .neq('stage', 'closed_lost')
        .order('expected_close_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['sales-forecast', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_forecasts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('forecast_period', period)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const generateForecast = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('sales-ai-insights', {
        body: { 
          action: 'generate_forecast', 
          data: { 
            deals: deals || [], 
            period,
            userId: user?.id,
            tenantId: currentTenant?.id
          } 
        }
      });
      
      if (error) throw error;
      return data as ForecastResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-forecast'] });
      toast.success("Forecast generated successfully");
    },
    onError: (error) => {
      toast.error("Failed to generate forecast: " + error.message);
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'high': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Prepare chart data from deals
  const chartData = deals?.reduce((acc: any[], deal) => {
    const month = deal.expected_close_date 
      ? new Date(deal.expected_close_date).toLocaleString('default', { month: 'short' })
      : 'Unscheduled';
    
    const existing = acc.find(d => d.month === month);
    if (existing) {
      existing.pipeline += deal.value || 0;
      existing.weighted += (deal.value || 0) * ((deal.win_probability || 50) / 100);
    } else {
      acc.push({
        month,
        pipeline: deal.value || 0,
        weighted: (deal.value || 0) * ((deal.win_probability || 50) / 100)
      });
    }
    return acc;
  }, []) || [];

  // Stage distribution data
  const stageData = deals?.reduce((acc: any[], deal) => {
    const existing = acc.find(d => d.stage === deal.stage);
    if (existing) {
      existing.value += deal.value || 0;
      existing.count += 1;
    } else {
      acc.push({
        stage: deal.stage,
        value: deal.value || 0,
        count: 1
      });
    }
    return acc;
  }, []) || [];

  const totalPipeline = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
  const factors = forecast?.factors as ForecastResult['factors'] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            AI Sales Forecasting
          </h2>
          <p className="text-muted-foreground">AI-powered revenue predictions and pipeline analysis</p>
        </div>
        <Button
          onClick={() => generateForecast.mutate()}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          Generate Forecast
        </Button>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-6">
          {/* Forecast Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted Revenue</p>
                    <p className="text-2xl font-bold text-green-500">
                      ${((forecast?.predicted_revenue || 0) / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Weighted Pipeline</p>
                    <p className="text-2xl font-bold text-blue-500">
                      ${((forecast?.weighted_pipeline || 0) / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold">{forecast?.confidence_score || 0}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <Progress value={forecast?.confidence_score || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Level</p>
                    <Badge className={getRiskColor((factors as any)?.risk_assessment || 'medium')}>
                      {((factors as any)?.risk_assessment || 'UNKNOWN').toUpperCase()}
                    </Badge>
                  </div>
                  <AlertCircle className={`h-8 w-8 ${getRiskColor((factors as any)?.risk_assessment || 'medium').split(' ')[0]}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis */}
          {forecast?.ai_analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{forecast.ai_analysis}</p>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Area type="monotone" dataKey="pipeline" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Pipeline" />
                      <Area type="monotone" dataKey="weighted" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} name="Weighted" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Factors */}
          {factors && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {factors.positive && factors.positive.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Positive Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {factors.positive.map((factor, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {factors.negative && factors.negative.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      Negative Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {factors.negative.map((factor, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {factors.recommendations && factors.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-600 flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {factors.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Brain className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
