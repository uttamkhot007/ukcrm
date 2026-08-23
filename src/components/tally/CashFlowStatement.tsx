import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface CashFlowItem {
  category: string;
  description: string;
  amount: number;
}

interface FinanceInsights {
  predictions: string[];
  recommendations: string[];
  risks: string[];
}

export function CashFlowStatement() {
  const { currentTenant } = useTenant();
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [insights, setInsights] = useState<FinanceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Fetch voucher data to calculate cash flows
  const { data: voucherData = [], isLoading } = useQuery({
    queryKey: ["cash-flow-vouchers", currentTenant?.id, fromDate, toDate],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("vouchers") as any)
        .select(`
          *,
          voucher_type:voucher_types(*),
          entries:voucher_entries(*, ledger:ledger_accounts(*, account_group:account_groups(*)))
        `)
        .eq("tenant_id", currentTenant.id)
        .gte("voucher_date", fromDate)
        .lte("voucher_date", toDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate cash flows by category
  const calculateCashFlows = () => {
    const operating: CashFlowItem[] = [];
    const investing: CashFlowItem[] = [];
    const financing: CashFlowItem[] = [];

    let operatingTotal = 0;
    let investingTotal = 0;
    let financingTotal = 0;

    voucherData.forEach((voucher: any) => {
      voucher.entries?.forEach((entry: any) => {
        const groupNature = entry.ledger?.account_group?.nature;
        const groupName = entry.ledger?.account_group?.name?.toLowerCase() || "";
        const ledgerName = entry.ledger?.name?.toLowerCase() || "";
        const netAmount = (entry.debit_amount || 0) - (entry.credit_amount || 0);

        // Operating Activities
        if (groupNature === 'income' || groupNature === 'expense') {
          operating.push({
            category: groupNature === 'income' ? 'Cash from Operations' : 'Operating Expenses',
            description: entry.ledger?.name || 'Unknown',
            amount: groupNature === 'income' ? -netAmount : netAmount
          });
          operatingTotal += groupNature === 'income' ? -netAmount : netAmount;
        }
        // Investing Activities (Fixed Assets, Investments)
        else if (groupName.includes('fixed asset') || groupName.includes('investment') || ledgerName.includes('investment')) {
          investing.push({
            category: netAmount > 0 ? 'Purchase of Assets' : 'Sale of Assets',
            description: entry.ledger?.name || 'Unknown',
            amount: netAmount
          });
          investingTotal += netAmount;
        }
        // Financing Activities (Loans, Capital)
        else if (groupName.includes('loan') || groupName.includes('capital') || groupName.includes('borrowing')) {
          financing.push({
            category: netAmount > 0 ? 'Loan Repayment' : 'Loan Received',
            description: entry.ledger?.name || 'Unknown',
            amount: netAmount
          });
          financingTotal += netAmount;
        }
      });
    });

    return {
      operating: { items: operating, total: operatingTotal },
      investing: { items: investing, total: investingTotal },
      financing: { items: financing, total: financingTotal },
      netChange: operatingTotal + investingTotal + financingTotal
    };
  };

  const cashFlows = calculateCashFlows();

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = `₹${absAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    return amount < 0 ? `(${formatted})` : formatted;
  };

  // Fetch AI insights
  const fetchInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("finance-ai-insights", {
        body: {
          analysisType: "cash-flow",
          metrics: {
            operatingCashFlow: cashFlows.operating.total,
            investingCashFlow: cashFlows.investing.total,
            financingCashFlow: cashFlows.financing.total,
            netCashChange: cashFlows.netChange,
            openingCash: 0,
            closingCash: cashFlows.netChange
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

  const renderSection = (title: string, items: CashFlowItem[], total: number, icon: React.ReactNode) => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Particulars</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No transactions in this category
                </TableCell>
              </TableRow>
            ) : (
              items.slice(0, 10).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className={`text-right font-mono ${item.amount < 0 ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
                    {formatAmount(item.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell>Net {title}</TableCell>
              <TableCell className={`text-right font-mono ${total < 0 ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
                {formatAmount(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Cash Flow Statement
          </h2>
          <p className="text-muted-foreground">Indirect method cash flow analysis with AI insights</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading cash flow data...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Operating Activities</div>
                <div className={`text-2xl font-bold ${cashFlows.operating.total >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                  {formatAmount(cashFlows.operating.total)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Investing Activities</div>
                <div className={`text-2xl font-bold ${cashFlows.investing.total >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                  {formatAmount(cashFlows.investing.total)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Financing Activities</div>
                <div className={`text-2xl font-bold ${cashFlows.financing.total >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                  {formatAmount(cashFlows.financing.total)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Net Change in Cash</div>
                <div className={`text-2xl font-bold ${cashFlows.netChange >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                  {formatAmount(cashFlows.netChange)}
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
                  AI Cash Flow Insights
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
              <CardDescription>AI-powered analysis of your cash flow patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : insightsError ? (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm">{insightsError}</p>
                </div>
              ) : insights ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <Target className="h-4 w-4" />
                      Predictions
                    </div>
                    <ul className="space-y-1">
                      {insights.predictions.map((p, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-blue-500">•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                      <Lightbulb className="h-4 w-4" />
                      Recommendations
                    </div>
                    <ul className="space-y-1">
                      {insights.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <CheckCircle className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />{r}
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
                      {insights.risks.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <AlertTriangle className="h-3 w-3 mt-1 text-orange-500 flex-shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Button onClick={fetchInsights} variant="ghost" size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cash Flow Sections */}
          {renderSection(
            "Cash Flow from Operating Activities",
            cashFlows.operating.items,
            cashFlows.operating.total,
            <TrendingUp className="h-5 w-5 text-blue-500" />
          )}

          {renderSection(
            "Cash Flow from Investing Activities",
            cashFlows.investing.items,
            cashFlows.investing.total,
            <TrendingDown className="h-5 w-5 text-orange-500" />
          )}

          {renderSection(
            "Cash Flow from Financing Activities",
            cashFlows.financing.items,
            cashFlows.financing.total,
            <Wallet className="h-5 w-5 text-purple-500" />
          )}

          {/* Net Change Summary */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Net Increase/(Decrease) in Cash</span>
                <Badge variant={cashFlows.netChange >= 0 ? "default" : "destructive"} className="text-lg px-4 py-1">
                  {formatAmount(cashFlows.netChange)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
