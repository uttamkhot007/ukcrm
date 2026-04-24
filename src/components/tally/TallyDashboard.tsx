import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Receipt, 
  BarChart3,
  Wallet,
  ArrowUp,
  ArrowDown,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface FinanceInsights {
  predictions: string[];
  recommendations: string[];
  risks: string[];
}

export function TallyDashboard() {
  const { currentTenant } = useTenant();
  const [insights, setInsights] = useState<FinanceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Fetch ledger data for summary
  const { data: ledgers = [], isLoading: ledgersLoading } = useQuery({
    queryKey: ["dashboard-ledgers", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .select("*, account_group:account_groups(name, nature)")
        .eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch vouchers for today's summary
  const { data: todayVouchers = [] } = useQuery({
    queryKey: ["today-vouchers", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await (supabase
        .from("vouchers") as any)
        .select("*, entries:voucher_entries(*)")
        .eq("tenant_id", currentTenant.id)
        .eq("voucher_date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate metrics
  const calculateMetrics = () => {
    const cashLedgers = ledgers.filter((l: any) => 
      l.name?.toLowerCase().includes('cash') && l.account_group?.nature === 'assets'
    );
    const bankLedgers = ledgers.filter((l: any) => 
      l.name?.toLowerCase().includes('bank') && l.account_group?.nature === 'assets'
    );
    const incomeLedgers = ledgers.filter((l: any) => l.account_group?.nature === 'income');
    const expenseLedgers = ledgers.filter((l: any) => l.account_group?.nature === 'expense');

    const cashInHand = cashLedgers.reduce((sum: number, l: any) => sum + (l.current_balance || 0), 0);
    const bankBalance = bankLedgers.reduce((sum: number, l: any) => sum + (l.current_balance || 0), 0);
    const totalIncome = incomeLedgers.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const totalExpenses = expenseLedgers.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    // Today's transactions
    let todayReceipts = 0;
    let todayPayments = 0;
    todayVouchers.forEach((v: any) => {
      v.entries?.forEach((e: any) => {
        todayReceipts += e.credit_amount || 0;
        todayPayments += e.debit_amount || 0;
      });
    });

    return {
      cashInHand,
      bankBalance,
      totalIncome,
      totalExpenses,
      netProfit,
      todayReceipts,
      todayPayments,
      todayNet: todayReceipts - todayPayments
    };
  };

  const metrics = calculateMetrics();

  // Fetch AI insights
  const fetchInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("finance-ai-insights", {
        body: {
          analysisType: "dashboard",
          metrics: {
            totalIncome: metrics.totalIncome,
            totalExpenses: metrics.totalExpenses,
            netProfit: metrics.netProfit,
            cashInHand: metrics.cashInHand,
            bankBalance: metrics.bankBalance,
            todayReceipts: metrics.todayReceipts,
            todayPayments: metrics.todayPayments
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

  const formatAmount = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Accounting Dashboard
          </h1>
          <p className="text-muted-foreground">Complete financial overview with AI insights</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatAmount(metrics.totalIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <ArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatAmount(metrics.totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${metrics.netProfit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <TrendingUp className={`h-5 w-5 ${metrics.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net {metrics.netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                <p className={`text-xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatAmount(metrics.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash + Bank</p>
                <p className="text-xl font-bold">
                  {formatAmount(metrics.cashInHand + metrics.bankBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipts</span>
              <span className="font-medium text-green-600">{formatAmount(metrics.todayReceipts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payments</span>
              <span className="font-medium text-red-600">{formatAmount(metrics.todayPayments)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">Net</span>
              <span className={`font-medium ${metrics.todayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(metrics.todayNet)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cash & Bank */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-blue-500" />
              Cash & Bank
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cash in Hand</span>
              <span className="font-medium font-mono">{formatAmount(metrics.cashInHand)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank Balance</span>
              <span className="font-medium font-mono">{formatAmount(metrics.bankBalance)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">Total Funds</span>
              <span className="font-medium font-mono">{formatAmount(metrics.cashInHand + metrics.bankBalance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* GST Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-500" />
              GST Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GSTR-1 Due</span>
              <Badge variant="outline">11th of next month</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GSTR-3B Due</span>
              <Badge variant="outline">20th of next month</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Financial Insights
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
          <CardDescription>
            AI-powered analysis of your financial data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : insightsError ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p>{insightsError}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchInsights}>
                Try Again
              </Button>
            </div>
          ) : insights ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Predictions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  <Target className="h-4 w-4" />
                  Predictions
                </div>
                <ul className="space-y-2">
                  {insights.predictions.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-blue-500">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <Lightbulb className="h-4 w-4" />
                  Recommendations
                </div>
                <ul className="space-y-2">
                  {insights.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <CheckCircle className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Alerts
                </div>
                <ul className="space-y-2">
                  {insights.risks.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <AlertTriangle className="h-3 w-3 mt-1 text-orange-500 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/50" />
              <p className="text-muted-foreground mb-4">
                Get AI-powered insights about your financial health
              </p>
              <Button onClick={fetchInsights}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
