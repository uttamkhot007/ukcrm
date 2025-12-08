import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialOverview } from "./FinancialOverview";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { TrendAnalysis } from "./TrendAnalysis";
import { TopPerformersAnalytics } from "./TopPerformersAnalytics";
import { BusinessInsights } from "./BusinessInsights";
import { PredictionsAndRecommendations } from "./PredictionsAndRecommendations";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Lightbulb, 
  Brain 
} from "lucide-react";

export function ManagementAnalyticsModule() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Management Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive business intelligence and performance insights
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background">
            <BarChart3 className="h-4 w-4" />
            Financial Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2 data-[state=active]:bg-background">
            <TrendingUp className="h-4 w-4" />
            Trend Analysis
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2 data-[state=active]:bg-background">
            <Target className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="performers" className="gap-2 data-[state=active]:bg-background">
            <Users className="h-4 w-4" />
            Top Performers
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2 data-[state=active]:bg-background">
            <Lightbulb className="h-4 w-4" />
            Business Insights
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-2 data-[state=active]:bg-background">
            <Brain className="h-4 w-4" />
            AI Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FinancialOverview />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendAnalysis />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics />
        </TabsContent>

        <TabsContent value="performers" className="space-y-6">
          <TopPerformersAnalytics />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <BusinessInsights />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <PredictionsAndRecommendations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
