import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Manual refresh for kept-alive panes.
 *
 * Because visited sub-modules stay mounted and their queries are served from a
 * persisted cache, data can be up to `staleTime` old. This button lets the user
 * force a re-fetch of everything currently mounted without reloading the app or
 * losing pane state (filters, scroll, form input all survive).
 */
export function ModuleRefreshButton({
  label = "Refresh",
  className,
  /** Optional narrowing: only refetch queries whose key starts with this. */
  scopeKey,
}: {
  label?: string;
  className?: string;
  scopeKey?: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({
        type: "active",
        ...(scopeKey ? { queryKey: scopeKey } : {}),
      });
      setLastRefreshed(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, scopeKey]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={refresh}
      disabled={refreshing}
      aria-label={
        lastRefreshed
          ? `${label}. Last refreshed at ${lastRefreshed.toLocaleTimeString()}`
          : label
      }
      title={
        lastRefreshed
          ? `Last refreshed at ${lastRefreshed.toLocaleTimeString()}`
          : "Re-fetch the latest data"
      }
      className={cn("gap-2", className)}
    >
      <RefreshCw
        className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
        aria-hidden="true"
      />
      <span>{refreshing ? "Refreshing…" : label}</span>
    </Button>
  );
}
