import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function MaintenanceBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState("System maintenance in progress. Some features may be temporarily unavailable.");
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check for maintenance mode in organization settings
    const checkMaintenanceMode = async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("senior_management")
        .limit(1)
        .single();

      if (data?.senior_management) {
        const settings = data.senior_management as Record<string, unknown>;
        if (settings.maintenance_mode === true) {
          setIsVisible(true);
          if (settings.maintenance_message) {
            setMessage(settings.maintenance_message as string);
          }
        }
      }
    };

    checkMaintenanceMode();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("maintenance-mode")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "organization_settings",
        },
        (payload) => {
          const settings = payload.new.senior_management as Record<string, unknown>;
          if (settings?.maintenance_mode === true) {
            setIsVisible(true);
            setIsDismissed(false);
            if (settings.maintenance_message) {
              setMessage(settings.maintenance_message as string);
            }
          } else {
            setIsVisible(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!isVisible || isDismissed) return null;

  return (
    <div className={cn(
      "bg-amber-500/90 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium",
      "animate-in slide-in-from-top duration-300"
    )}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
      <button
        onClick={() => setIsDismissed(true)}
        className="ml-auto p-1 hover:bg-amber-600/20 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}