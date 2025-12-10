import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  TrendingUp, 
  Lightbulb, 
  AlertTriangle, 
  RefreshCw,
  Sparkles
} from "lucide-react";
import type { ExecutiveInsights } from "@/hooks/useExecutiveInsights";

interface AIInsightsPanelProps {
  insights: ExecutiveInsights | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  title?: string;
}

export function AIInsightsPanel({ 
  insights, 
  isLoading, 
  error, 
  onRefresh,
  title = "AI-Powered Insights"
}: AIInsightsPanelProps) {
  
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            Analyzing Data...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && !insights && (
          <div className="text-sm text-muted-foreground text-center py-4">
            <p>Click refresh to generate AI insights</p>
          </div>
        )}

        {insights && (
          <>
            {/* Predictions */}
            {insights.predictions?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                  <span className="font-semibold text-sm">Predictions</span>
                </div>
                <div className="space-y-2 pl-6">
                  {insights.predictions.map((prediction, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="shrink-0 mt-0.5">
                        {i + 1}
                      </Badge>
                      <span className="text-muted-foreground">{prediction}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {insights.recommendations?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-chart-4" />
                  <span className="font-semibold text-sm">Recommendations</span>
                </div>
                <div className="space-y-2 pl-6">
                  {insights.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="secondary" className="shrink-0 mt-0.5">
                        {i + 1}
                      </Badge>
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {insights.risks?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-semibold text-sm">Risk Alerts</span>
                </div>
                <div className="space-y-2 pl-6">
                  {insights.risks.map((risk, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="destructive" className="shrink-0 mt-0.5">
                        !
                      </Badge>
                      <span className="text-muted-foreground">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!insights && !error && (
          <div className="text-center py-4">
            <Button onClick={onRefresh} className="gap-2">
              <Brain className="h-4 w-4" />
              Generate AI Insights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
