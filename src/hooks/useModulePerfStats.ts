/**
 * Frontend performance benchmarks for the observability dashboard.
 *
 * Reads the aggregated real-user numbers from the gateway RUM collector. If
 * the gateway is unreachable (local dev, backend down) it degrades to the
 * samples this browser tab collected, so the panel is always useful rather
 * than sometimes empty.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { restRequest } from "@/integrations/api/rest-client";
import { onPerfSample, summarizeLocalSamples, SWITCH_BUDGET_MS } from "@/lib/perf-metrics";

export interface ModuleBenchmark {
  module: string;
  switches: number;
  p50Ms: number;
  p75Ms: number;
  p95Ms: number;
  maxMs: number;
  withinBudgetRatio: number;
  warmRatio: number;
  warmP95Ms: number;
  coldP95Ms: number;
  chunkLoads: number;
  chunkFailures: number;
  preloadAttempts: number;
  preloadSuccessRatio: number;
}

export interface ModulePerfStats {
  generatedAt: number;
  windowMs: number;
  samples: number;
  budgetMs: number;
  overall: {
    switches: number;
    p50Ms: number;
    p75Ms: number;
    p95Ms: number;
    withinBudgetRatio: number;
    warmRatio: number;
    preloadAttempts: number;
    preloadSuccessRatio: number;
    chunkLoads: number;
    chunkFailureRatio: number;
    offlineFailures: number;
    avgAttempts: number;
    sessions: number;
  };
  modules: ModuleBenchmark[];
  regressions: Array<{ module: string; p95Ms: number; budgetMs: number; switches: number }>;
  byConnection: Array<{ effectiveType: string; switches: number; p95Ms: number }>;
  byBuild: Array<{ buildVersion: string; switches: number; p95Ms: number; chunkFailures: number }>;
}

/** Shape this tab's own samples like the server response. */
function localStats(windowMs: number): ModulePerfStats {
  const s = summarizeLocalSamples();
  return {
    generatedAt: Date.now(),
    windowMs,
    samples: s.switches + s.chunkLoads,
    budgetMs: SWITCH_BUDGET_MS,
    overall: {
      switches: s.switches,
      p50Ms: s.p50Ms,
      p75Ms: s.p95Ms,
      p95Ms: s.p95Ms,
      withinBudgetRatio: s.withinBudgetRatio,
      warmRatio: s.warmRatio,
      preloadAttempts: s.preloadAttempts,
      preloadSuccessRatio: s.preloadSuccessRatio,
      chunkLoads: s.chunkLoads,
      chunkFailureRatio: s.chunkLoads ? s.chunkFailures / s.chunkLoads : 0,
      offlineFailures: 0,
      avgAttempts: 0,
      sessions: 1,
    },
    modules: s.modules.map((m) => ({
      module: m.module,
      switches: m.switches,
      p50Ms: m.p50Ms,
      p75Ms: m.p95Ms,
      p95Ms: m.p95Ms,
      maxMs: m.p95Ms,
      withinBudgetRatio: 0,
      warmRatio: m.warmRatio,
      warmP95Ms: 0,
      coldP95Ms: 0,
      chunkLoads: 0,
      chunkFailures: 0,
      preloadAttempts: 0,
      preloadSuccessRatio: 0,
    })),
    regressions: s.modules
      .filter((m) => m.p95Ms > SWITCH_BUDGET_MS)
      .map((m) => ({ module: m.module, p95Ms: m.p95Ms, budgetMs: SWITCH_BUDGET_MS, switches: m.switches })),
    byConnection: [],
    byBuild: [],
  };
}

export function useModulePerfStats(windowMs: number, paused = false) {
  const [, tick] = useState(0);

  // Re-render on local samples so the panel is live even without a backend.
  useEffect(() => onPerfSample(() => tick((n) => n + 1)), []);

  const query = useQuery<ModulePerfStats>({
    queryKey: ["module-perf-stats", windowMs],
    queryFn: () =>
      restRequest<ModulePerfStats>("/api/_rum/module-perf/stats", { params: { windowMs } }),
    refetchInterval: paused ? false : 10_000,
    retry: false,
  });

  return {
    stats: query.data ?? localStats(windowMs),
    /** True when we are showing this tab's samples instead of fleet-wide data. */
    isLocalOnly: !query.data,
    isLoading: query.isLoading,
    refresh: () => void query.refetch(),
  };
}
