/**
 * Live trace feed for the observability dashboard.
 *
 * Streams trace summaries from the gateway collector over SSE. `EventSource`
 * cannot carry an Authorization header, so we read the stream with `fetch` and
 * parse SSE frames manually. If streaming is unavailable (proxy buffering,
 * older deploys, backend offline) we transparently fall back to polling, so the
 * dashboard is always live rather than sometimes blank.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { restRequest } from "@/integrations/api/rest-client";
import { tokenStore } from "@/lib/token-store";

export type SpanStatus = "ok" | "error";
export type SpanKind = "server" | "client" | "internal" | "producer" | "consumer";

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  name: string;
  service: string;
  kind: SpanKind;
  startTime: number;
  durationMs: number;
  status: SpanStatus;
  statusMessage?: string;
  tenantId?: string;
  userId?: string;
  attributes: Record<string, string | number | boolean>;
}

export interface TraceSummary {
  traceId: string;
  correlationId: string;
  rootName: string;
  entryService: string;
  services: string[];
  spanCount: number;
  errorCount: number;
  startTime: number;
  durationMs: number;
  status: SpanStatus;
  tenantId?: string;
  userId?: string;
  httpStatus?: number;
}

export interface TraceDetail extends TraceSummary {
  spans: TraceSpan[];
}

export interface TraceStats {
  generatedAt: number;
  windowMs: number;
  totals: { traces: number; spans: number; errors: number; errorRate: number };
  latency: { p50: number; p95: number; p99: number };
  services: Array<{
    service: string;
    spans: number;
    errors: number;
    errorRate: number;
    p95Ms: number;
    avgMs: number;
  }>;
  dependencies: Array<{ from: string; to: string; calls: number; errors: number; avgMs: number }>;
}

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (typeof window !== "undefined" ? window.location.origin : "");

const MAX_TRACES = 200;

export type FeedStatus = "connecting" | "streaming" | "polling" | "offline";

export function useTraceFeed(options: { paused: boolean; limit?: number }) {
  const { paused, limit = MAX_TRACES } = options;
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const merge = useCallback(
    (incoming: TraceSummary[]) => {
      if (pausedRef.current) return;
      setTraces((prev) => {
        const byId = new Map(prev.map((t) => [t.traceId, t]));
        for (const t of incoming) byId.set(t.traceId, t);
        return Array.from(byId.values())
          .sort((a, b) => b.startTime - a.startTime)
          .slice(0, limit);
      });
    },
    [limit],
  );

  const loadSnapshot = useCallback(async () => {
    const res = await restRequest<{ traces: TraceSummary[] }>("/api/_traces", {
      params: { limit },
    });
    merge(res.traces ?? []);
  }, [limit, merge]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    const controller = new AbortController();

    const startPolling = () => {
      if (cancelled || pollTimer) return;
      setStatus("polling");
      pollTimer = setInterval(() => {
        void loadSnapshot().catch(() => setStatus("offline"));
      }, 4000);
    };

    const run = async () => {
      try {
        await loadSnapshot();
        if (cancelled) return;
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setStatus("offline");
        setError(err instanceof Error ? err.message : "Trace collector unreachable");
        return;
      }

      try {
        const token = tokenStore.get();
        const response = await fetch(`${API_URL}/api/_traces/stream`, {
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`stream ${response.status}`);

        setStatus("streaming");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done || cancelled) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
            const eventLine = frame.split("\n").find((l) => l.startsWith("event:"));
            if (!dataLine || eventLine?.trim() !== "event: trace") continue;
            try {
              merge([JSON.parse(dataLine.slice(5).trim()) as TraceSummary]);
            } catch {
              /* ignore malformed frame */
            }
          }
        }
        if (!cancelled) startPolling();
      } catch {
        if (!cancelled) startPolling();
      }
    };

    void run();
    return () => {
      cancelled = true;
      controller.abort();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [loadSnapshot, merge]);

  return { traces, status, error, refresh: loadSnapshot, clear: () => setTraces([]) };
}

export async function fetchTraceStats(windowMs: number): Promise<TraceStats> {
  return restRequest<TraceStats>("/api/_traces/stats", { params: { windowMs } });
}

export async function fetchTraceDetail(traceId: string): Promise<TraceDetail> {
  return restRequest<TraceDetail>(`/api/_traces/${traceId}`);
}
