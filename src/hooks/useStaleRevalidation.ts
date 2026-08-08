import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * TTL-based revalidation for kept-alive panes.
 *
 * Kept-alive sub-modules stay mounted, so React Query never re-runs its
 * "refetch on mount" path when the user tabs back to them — data could sit
 * untouched for as long as the pane lives. This hook adds an explicit
 * time-to-live: whenever a pane is shown again (or while it stays visible),
 * any query older than `ttlMs` is refetched in the background. Fresh data is
 * left alone, so tab hopping stays instant and free of network chatter.
 *
 * Only stale queries are refetched (`stale: true`), and only while the browser
 * tab itself is visible, so hidden panes and backgrounded tabs never poll.
 */
export interface StaleRevalidationOptions {
  /** Whether the pane is the one currently on screen. */
  active: boolean;
  /** How old data may get before an automatic refetch, in ms. */
  ttlMs?: number;
  /** Skip revalidation entirely (e.g. an editing form is dirty). */
  enabled?: boolean;
  /** Narrow the refetch to one query key prefix. */
  scopeKey?: readonly unknown[];
  /** Called after a TTL-triggered refetch settles. */
  onRevalidated?: (at: Date) => void;
}

export const DEFAULT_MODULE_TTL_MS = 1000 * 60 * 5;

export function useStaleRevalidation({
  active,
  ttlMs = DEFAULT_MODULE_TTL_MS,
  enabled = true,
  scopeKey,
  onRevalidated,
}: StaleRevalidationOptions) {
  const queryClient = useQueryClient();
  const lastRevalidatedAt = useRef<number>(Date.now());
  const inFlight = useRef(false);
  const callbackRef = useRef(onRevalidated);
  callbackRef.current = onRevalidated;

  const revalidate = useCallback(
    async (force = false) => {
      if (inFlight.current) return;
      if (!force && Date.now() - lastRevalidatedAt.current < ttlMs) return;
      if (typeof document !== "undefined" && document.hidden) return;

      inFlight.current = true;
      try {
        await queryClient.refetchQueries({
          type: "active",
          stale: true,
          ...(scopeKey ? { queryKey: scopeKey } : {}),
        });
        lastRevalidatedAt.current = Date.now();
        callbackRef.current?.(new Date());
      } catch {
        // A failed background revalidation must never surface as an error;
        // the next TTL tick (or a manual refresh) will retry.
      } finally {
        inFlight.current = false;
      }
    },
    [queryClient, scopeKey, ttlMs],
  );

  // Revalidate when the pane comes back into view after its TTL elapsed.
  useEffect(() => {
    if (!enabled || !active) return;
    void revalidate();
  }, [active, enabled, revalidate]);

  // Keep the visible pane fresh while the user stays on it.
  useEffect(() => {
    if (!enabled || !active) return;
    const timer = window.setInterval(() => void revalidate(), ttlMs);
    const onVisible = () => {
      if (!document.hidden) void revalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, enabled, revalidate, ttlMs]);

  return { revalidate: () => revalidate(true) };
}
