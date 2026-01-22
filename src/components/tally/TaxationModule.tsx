import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Receipt, 
  Calculator, 
  FileCheck, 
  Truck,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Scale
} from "lucide-react";
import { GSTModule } from "./GSTModule";
import { TDSTCSModule } from "./TDSTCSModule";
import { EInvoicingModule } from "./EInvoicingModule";
import { EWayBillModule } from "./EWayBillModule";
import { supabase } from "@/integrations/supabase/client";

interface TaxationModuleProps {
  initialTab?: string;
}

interface FinanceInsights {
  predictions: string[];
  recommendations: string[];
  risks: string[];
}

export function TaxationModule({ initialTab = "gst" }: TaxationModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [insights, setInsights] = useState<FinanceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const tabs = [
    { id: "gst", label: "GST", icon: Receipt },
    { id: "tds-tcs", label: "TDS/TCS", icon: Calculator },
    { id: "e-invoicing", label: "E-Invoicing", icon: FileCheck },
    { id: "eway-bill", label: "E-Way Bill", icon: Truck },
  ];

  // Fetch AI insights for taxation
  const fetchInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("finance-ai-insights", {
        body: {
          analysisType: "dashboard",
          metrics: {
            totalIncome: 0,
            totalExpenses: 0,
            netProfit: 0,
            cashInHand: 0,
            bankBalance: 0,
            todayReceipts: 0,
            todayPayments: 0
          }
        }
      });

      if (error) throw error;
      if (data.error) {
        setInsightsError(data.error);
        return;
      }
      setInsights(data);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to fetch insights");
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-8 w-8" />
            Taxation & Compliance
          </h1>
          <p className="text-muted-foreground">GST, TDS/TCS, E-Invoicing & E-Way Bill management</p>
        </div>
      </div>

      {/* AI Insights Panel */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Tax Compliance Insights
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchInsights}
              disabled={insightsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${insightsLoading ? 'animate-spin' : ''}`} />
              {insights ? 'Refresh' : 'Generate'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-16 flex-1" />
              <Skeleton className="h-16 flex-1" />
              <Skeleton className="h-16 flex-1" />
            </div>
          ) : insightsError ? (
            <div className="text-center py-3 text-muted-foreground text-sm">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              {insightsError}
            </div>
          ) : insights ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  <Target className="h-4 w-4" />
                  Predictions
                </div>
                <ul className="space-y-1">
                  {insights.predictions.slice(0, 2).map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-blue-500">•</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <Lightbulb className="h-4 w-4" />
                  Recommendations
                </div>
                <ul className="space-y-1">
                  {insights.recommendations.slice(0, 2).map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Alerts
                </div>
                <ul className="space-y-1">
                  {insights.risks.slice(0, 2).map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <AlertTriangle className="h-3 w-3 mt-0.5 text-orange-500 flex-shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-3">
              <Button onClick={fetchInsights} variant="ghost" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Insights
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="gst" className="mt-6">
          <GSTModule />
        </TabsContent>

        <TabsContent value="tds-tcs" className="mt-6">
          <TDSTCSModule />
        </TabsContent>

        <TabsContent value="e-invoicing" className="mt-6">
          <EInvoicingModule />
        </TabsContent>

        <TabsContent value="eway-bill" className="mt-6">
          <EWayBillModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
