import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExchangeRateResponse {
  from: string;
  to: string;
  rate: number;
  date: string;
}

export function useExchangeRates() {
  const { data: usdToInr, isLoading: isLoadingUsdToInr } = useQuery({
    queryKey: ["exchange-rate", "USD", "INR"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<ExchangeRateResponse>("exchange-rates", {
        body: { from: "USD", to: "INR" },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
  });

  const { data: inrToUsd, isLoading: isLoadingInrToUsd } = useQuery({
    queryKey: ["exchange-rate", "INR", "USD"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<ExchangeRateResponse>("exchange-rates", {
        body: { from: "INR", to: "USD" },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
    refetchInterval: 1000 * 60 * 60,
  });

  const convert = (amount: number, fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) return amount;
    
    if (fromCurrency === "USD" && toCurrency === "INR" && usdToInr?.rate) {
      return amount * usdToInr.rate;
    }
    
    if (fromCurrency === "INR" && toCurrency === "USD" && inrToUsd?.rate) {
      return amount * inrToUsd.rate;
    }
    
    return null;
  };

  const formatConvertedAmount = (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    formatCurrency: (value: number, currency?: string) => string
  ): string | null => {
    const converted = convert(amount, fromCurrency, toCurrency);
    if (converted === null) return null;
    return formatCurrency(converted, toCurrency);
  };

  return {
    usdToInrRate: usdToInr?.rate,
    inrToUsdRate: inrToUsd?.rate,
    rateDate: usdToInr?.date || inrToUsd?.date,
    isLoading: isLoadingUsdToInr || isLoadingInrToUsd,
    convert,
    formatConvertedAmount,
  };
}