import { useState } from "react";
import { supabase } from "@/integrations/api/client";
import { toast } from "sonner";

export interface ExecutiveInsights {
  predictions: string[];
  recommendations: string[];
  risks: string[];
}

export function useExecutiveInsights() {
  const [insights, setInsights] = useState<ExecutiveInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (
    dashboardType: "vcfo" | "vciso" | "vcro",
    metrics: Record<string, number | string>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("executive-insights", {
        body: { dashboardType, metrics },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("AI rate limit reached. Please try again in a moment.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted. Please contact administrator.");
        } else {
          throw new Error(data.error);
        }
        setError(data.error);
        return null;
      }

      setInsights(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch AI insights";
      setError(message);
      console.error("Executive insights error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { insights, isLoading, error, fetchInsights };
}
