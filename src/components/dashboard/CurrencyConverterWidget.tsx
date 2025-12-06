import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { ArrowRightLeft, RefreshCw, Loader2, TrendingUp, TrendingDown, History } from "lucide-react";
import { format } from "date-fns";

export function CurrencyConverterWidget() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [showHistory, setShowHistory] = useState(false);
  
  const { convert, usdToInrRate, inrToUsdRate, rateDate, isLoading, getHistoryForPair, isLoadingHistory } = useExchangeRates();
  const { formatCurrency } = useOrganizationSettings();

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = convert(numericAmount, fromCurrency, toCurrency);

  const usdToInrHistory = getHistoryForPair("USD", "INR").slice(0, 7);
  
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowHistory(!showHistory)}
            className="h-8 text-xs"
          >
            <History className="w-3 h-3 mr-1" />
            {showHistory ? "Hide" : "History"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showHistory ? (
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
        ) : (
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
              <div className="space-y-2">
                {usdToInrHistory.map((entry, index) => {
                  const prevRate = usdToInrHistory[index + 1]?.rate;
                  const change = prevRate ? entry.rate - prevRate : 0;
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