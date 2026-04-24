import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PieChart, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Download, Calculator } from "lucide-react";
import { format, endOfMonth } from "date-fns";

interface RatioData {
  name: string;
  value: number;
  benchmark: number;
  unit: string;
  status: "good" | "warning" | "bad";
  description: string;
}

export function RatioAnalysis() {
  const { currentTenant } = useTenant();
  const [asOnDate, setAsOnDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Fetch ledger data
  const { data: ledgers = [], isLoading } = useQuery({
    queryKey: ["ledgers-for-ratios", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .select(`
          *,
          account_group:account_groups(name, nature, affects_gross_profit)
        `)
        .eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate financial metrics
  const calculateMetrics = () => {
    // Categorize ledgers
    const currentAssets = ledgers.filter((l: any) => 
      l.account_group?.nature === 'assets' && 
      ['cash', 'bank', 'sundry debtors', 'stock', 'inventory'].some(term => 
        l.name.toLowerCase().includes(term) || l.account_group?.name?.toLowerCase().includes(term)
      )
    );
    
    const currentLiabilities = ledgers.filter((l: any) => 
      l.account_group?.nature === 'liabilities' && 
      ['sundry creditors', 'short term', 'current'].some(term => 
        l.name.toLowerCase().includes(term) || l.account_group?.name?.toLowerCase().includes(term)
      )
    );

    const fixedAssets = ledgers.filter((l: any) => 
      l.account_group?.nature === 'assets' && 
      !currentAssets.includes(l)
    );

    const longTermLiabilities = ledgers.filter((l: any) => 
      l.account_group?.nature === 'liabilities' && 
      !currentLiabilities.includes(l)
    );

    const equity = ledgers.filter((l: any) => 
      l.account_group?.nature === 'capital'
    );

    const income = ledgers.filter((l: any) => 
      l.account_group?.nature === 'income'
    );

    const expenses = ledgers.filter((l: any) => 
      l.account_group?.nature === 'expense'
    );

    // Calculate totals
    const totalCurrentAssets = currentAssets.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const totalCurrentLiabilities = currentLiabilities.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const totalFixedAssets = fixedAssets.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;
    const totalLiabilities = currentLiabilities.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0) + 
                            longTermLiabilities.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const totalEquity = equity.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const totalIncome = income.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    // Inventory
    const inventory = ledgers.filter((l: any) => 
      l.name.toLowerCase().includes('stock') || l.name.toLowerCase().includes('inventory')
    ).reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);

    // Debtors
    const debtors = ledgers.filter((l: any) => 
      l.name.toLowerCase().includes('debtor') || l.account_group?.name?.toLowerCase().includes('debtor')
    ).reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);

    // COGS (Direct Expenses)
    const cogs = expenses.filter((l: any) => l.account_group?.affects_gross_profit)
      .reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);

    return {
      totalCurrentAssets,
      totalCurrentLiabilities,
      totalFixedAssets,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalIncome,
      totalExpenses,
      netProfit,
      inventory,
      debtors,
      cogs
    };
  };

  const metrics = calculateMetrics();

  // Calculate ratios
  const calculateRatios = () => {
    const { 
      totalCurrentAssets, totalCurrentLiabilities, totalAssets, 
      totalLiabilities, totalEquity, totalIncome, totalExpenses,
      netProfit, inventory, debtors, cogs
    } = metrics;

    const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;

    // Liquidity Ratios
    const currentRatio = safeDiv(totalCurrentAssets, totalCurrentLiabilities);
    const quickRatio = safeDiv(totalCurrentAssets - inventory, totalCurrentLiabilities);

    // Profitability Ratios
    const grossProfitMargin = safeDiv((totalIncome - cogs), totalIncome) * 100;
    const netProfitMargin = safeDiv(netProfit, totalIncome) * 100;
    const returnOnAssets = safeDiv(netProfit, totalAssets) * 100;
    const returnOnEquity = safeDiv(netProfit, totalEquity) * 100;

    // Leverage Ratios
    const debtToEquity = safeDiv(totalLiabilities, totalEquity);
    const debtRatio = safeDiv(totalLiabilities, totalAssets);

    // Activity Ratios
    const assetTurnover = safeDiv(totalIncome, totalAssets);
    const inventoryTurnover = safeDiv(cogs, inventory);
    const receivablesDays = safeDiv(debtors, totalIncome) * 365;

    return {
      liquidity: [
        {
          name: "Current Ratio",
          value: currentRatio,
          benchmark: 2.0,
          unit: ":1",
          status: currentRatio >= 1.5 ? "good" : currentRatio >= 1.0 ? "warning" : "bad",
          description: "Ability to pay short-term obligations"
        },
        {
          name: "Quick Ratio",
          value: quickRatio,
          benchmark: 1.0,
          unit: ":1",
          status: quickRatio >= 1.0 ? "good" : quickRatio >= 0.5 ? "warning" : "bad",
          description: "Liquid assets vs. current liabilities"
        }
      ] as RatioData[],
      profitability: [
        {
          name: "Gross Profit Margin",
          value: grossProfitMargin,
          benchmark: 30,
          unit: "%",
          status: grossProfitMargin >= 30 ? "good" : grossProfitMargin >= 15 ? "warning" : "bad",
          description: "Profit after direct costs"
        },
        {
          name: "Net Profit Margin",
          value: netProfitMargin,
          benchmark: 10,
          unit: "%",
          status: netProfitMargin >= 10 ? "good" : netProfitMargin >= 5 ? "warning" : "bad",
          description: "Bottom-line profitability"
        },
        {
          name: "Return on Assets (ROA)",
          value: returnOnAssets,
          benchmark: 5,
          unit: "%",
          status: returnOnAssets >= 5 ? "good" : returnOnAssets >= 2 ? "warning" : "bad",
          description: "Efficiency in using assets"
        },
        {
          name: "Return on Equity (ROE)",
          value: returnOnEquity,
          benchmark: 15,
          unit: "%",
          status: returnOnEquity >= 15 ? "good" : returnOnEquity >= 8 ? "warning" : "bad",
          description: "Return generated on equity"
        }
      ] as RatioData[],
      leverage: [
        {
          name: "Debt to Equity Ratio",
          value: debtToEquity,
          benchmark: 1.0,
          unit: ":1",
          status: debtToEquity <= 1.0 ? "good" : debtToEquity <= 2.0 ? "warning" : "bad",
          description: "Financial leverage"
        },
        {
          name: "Debt Ratio",
          value: debtRatio * 100,
          benchmark: 50,
          unit: "%",
          status: debtRatio <= 0.5 ? "good" : debtRatio <= 0.7 ? "warning" : "bad",
          description: "Proportion of assets financed by debt"
        }
      ] as RatioData[],
      activity: [
        {
          name: "Asset Turnover",
          value: assetTurnover,
          benchmark: 1.0,
          unit: "x",
          status: assetTurnover >= 1.0 ? "good" : assetTurnover >= 0.5 ? "warning" : "bad",
          description: "Revenue generated per rupee of assets"
        },
        {
          name: "Inventory Turnover",
          value: inventoryTurnover,
          benchmark: 6,
          unit: "x",
          status: inventoryTurnover >= 6 ? "good" : inventoryTurnover >= 3 ? "warning" : "bad",
          description: "How often inventory is sold"
        },
        {
          name: "Receivables Days",
          value: receivablesDays,
          benchmark: 45,
          unit: " days",
          status: receivablesDays <= 45 ? "good" : receivablesDays <= 90 ? "warning" : "bad",
          description: "Average collection period"
        }
      ] as RatioData[]
    };
  };

  const ratios = calculateRatios();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "bad":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "bad": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (isNaN(value) || !isFinite(value)) return "N/A";
    return `${value.toFixed(2)}${unit}`;
  };

  const renderRatioCard = (ratio: RatioData) => (
    <Card key={ratio.name} className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(ratio.status)}`} />
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{ratio.name}</p>
            <p className="text-2xl font-bold">{formatValue(ratio.value, ratio.unit)}</p>
            <p className="text-xs text-muted-foreground">{ratio.description}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusIcon(ratio.status)}
            <span className="text-xs text-muted-foreground">
              Benchmark: {ratio.benchmark}{ratio.unit}
            </span>
          </div>
        </div>
        <Progress 
          value={Math.min((ratio.value / (ratio.benchmark * 2)) * 100, 100)} 
          className="mt-4 h-2"
        />
      </CardContent>
    </Card>
  );

  const formatCurrency = (amount: number) => `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Ratio Analysis
          </h2>
          <p className="text-muted-foreground">Financial health indicators and benchmarks</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>As on Date</Label>
            <Input
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Assets</div>
            <div className="text-xl font-bold">{formatCurrency(metrics.totalAssets)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Liabilities</div>
            <div className="text-xl font-bold">{formatCurrency(metrics.totalLiabilities)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Equity</div>
            <div className="text-xl font-bold">{formatCurrency(metrics.totalEquity)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div className={`text-xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.netProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading financial data...</div>
      ) : (
        <Tabs defaultValue="liquidity">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="leverage">Leverage</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="liquidity" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ratios.liquidity.map(renderRatioCard)}
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Liquidity Analysis</CardTitle>
                <CardDescription>Measures the company's ability to meet short-term obligations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Assets:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalCurrentAssets)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Liabilities:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalCurrentLiabilities)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inventory:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.inventory)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quick Assets:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalCurrentAssets - metrics.inventory)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profitability" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ratios.profitability.map(renderRatioCard)}
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Profitability Analysis</CardTitle>
                <CardDescription>Measures the company's ability to generate profits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Income:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalIncome)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Expenses:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalExpenses)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost of Goods Sold:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.cogs)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Profit:</span>
                    <span className={`ml-2 font-mono ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(metrics.netProfit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leverage" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ratios.leverage.map(renderRatioCard)}
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Leverage Analysis</CardTitle>
                <CardDescription>Measures the company's use of debt financing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Debt:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalLiabilities)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Equity:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalEquity)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Assets:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalAssets)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ratios.activity.map(renderRatioCard)}
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Activity Analysis</CardTitle>
                <CardDescription>Measures the efficiency of asset utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Inventory:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.inventory)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receivables:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.debtors)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="ml-2 font-mono">{formatCurrency(metrics.totalIncome)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
