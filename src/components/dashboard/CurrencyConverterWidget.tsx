import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { ArrowRightLeft, RefreshCw, Loader2 } from "lucide-react";

export function CurrencyConverterWidget() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");
  
  const { convert, usdToInrRate, inrToUsdRate, rateDate, isLoading } = useExchangeRates();
  const { formatCurrency } = useOrganizationSettings();

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = convert(numericAmount, fromCurrency, toCurrency);

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Currency Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          {usdToInrRate && (
            <p>1 USD = ₹{usdToInrRate.toFixed(2)}</p>
          )}
          {inrToUsdRate && (
            <p>1 INR = ${inrToUsdRate.toFixed(4)}</p>
          )}
          {rateDate && (
            <p className="text-muted-foreground/60">Rates as of {rateDate}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}