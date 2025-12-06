import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { ArrowRightLeft, RefreshCw, Loader2, TrendingUp, TrendingDown, History, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function CurrencyConverterWidget() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [viewMode, setViewMode] = useState<"converter" | "history" | "chart">("converter");
  
  const { convert, usdToInrRate, inrToUsdRate, rateDate, isLoading, getHistoryForPair, isLoadingHistory } = useExchangeRates();
  const { formatCurrency } = useOrganizationSettings();

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = convert(numericAmount, fromCurrency, toCurrency);

  const usdToInrHistory = getHistoryForPair("USD", "INR").slice(0, 14);
  
  // Prepare chart data (reverse to show oldest first)
  const chartData = [...usdToInrHistory].reverse().map(entry => ({
    date: format(new Date(entry.rate_date), "MMM d"),
    rate: Number(entry.rate),
  }));
  
  // Calculate trend
  const getTrend = () => {
    if (usdToInrHistory.length < 2) return null;
    const latest = usdToInrHistory[0]?.rate;
    const previous = usdToInrHistory[1]?.rate;
    if (!latest || !previous) return null;
    return latest > previous ? "up" : latest < previous ? "down" : "stable";
  };
  
  const trend = getTrend();

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Currency Converter
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              variant={viewMode === "converter" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("converter")}
              className="h-7 w-7 p-0"
            >
              <ArrowRightLeft className="w-3 h-3" />
            </Button>
            <Button 
              variant={viewMode === "chart" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("chart")}
              className="h-7 w-7 p-0"
            >
              <BarChart3 className="w-3 h-3" />
            </Button>
            <Button 
              variant={viewMode === "history" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("history")}
              className="h-7 w-7 p-0"
            >
              <History className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewMode === "converter" && (
          <>
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSwap}
                className="h-9 w-9"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-lg font-semibold"
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-center">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading rates...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-1">
                    {formatCurrency(numericAmount, fromCurrency)} =
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {convertedAmount !== null ? formatCurrency(convertedAmount, toCurrency) : "—"}
                  </p>
                </>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                {usdToInrRate && (
                  <p className="flex items-center gap-1">
                    1 USD = ₹{usdToInrRate.toFixed(2)}
                    {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                    {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                  </p>
                )}
              </div>
              {inrToUsdRate && (
                <p>1 INR = ${inrToUsdRate.toFixed(4)}</p>
              )}
              {rateDate && (
                <p className="text-muted-foreground/60">Rates as of {rateDate}</p>
              )}
            </div>
          </>
        )}

        {viewMode === "chart" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">USD → INR Rate Trend</h4>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No history available yet. Rates are tracked as you use the converter.
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {usdToInrRate && (
              <div className="text-center text-xs text-muted-foreground">
                Current: ₹{usdToInrRate.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {viewMode === "history" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">USD → INR Rate History</h4>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : usdToInrHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No history available yet. Rates are tracked as you use the converter.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {usdToInrHistory.map((entry, index) => {
                  const prevRate = usdToInrHistory[index + 1]?.rate;
                  const change = prevRate ? Number(entry.rate) - Number(prevRate) : 0;
                  return (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                    >
                      <span className="text-muted-foreground">
                        {format(new Date(entry.rate_date), "MMM d")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">₹{Number(entry.rate).toFixed(2)}</span>
                        {change !== 0 && (
                          <span className={`text-xs ${change > 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {change > 0 ? "+" : ""}{change.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}