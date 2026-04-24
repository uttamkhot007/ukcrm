import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";

export function useOrganizationSettings() {
  const { currentTenant } = useTenant();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!currentTenant?.id,
  });

  const currency = settings?.currency || "INR";
  const alternateCurrency = (settings as any)?.alternate_currency || "USD";
  
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
    alternateCurrency,
    formatCurrency,
    getCurrencySymbol,
  };
}
