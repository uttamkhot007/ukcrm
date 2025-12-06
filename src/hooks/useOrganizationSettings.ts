import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganizationSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const currency = settings?.currency || "INR";
  
  const formatCurrency = (value: number, overrideCurrency?: string) => {
    const currencyToUse = overrideCurrency || currency;
    const locale = currencyToUse === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyToUse,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCurrencySymbol = (overrideCurrency?: string) => {
    const currencyToUse = overrideCurrency || currency;
    const symbols: Record<string, string> = {
      USD: "$",
      INR: "₹",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
    };
    return symbols[currencyToUse] || currencyToUse;
  };

  return {
    settings,
    isLoading,
    currency,
    formatCurrency,
    getCurrencySymbol,
  };
}
