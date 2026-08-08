/**
 * Frontend performance benchmarks (real-user monitoring).
 *
 * Two things decide whether the app *feels* fast, and both are invisible from
 * a developer machine:
 *
 *   1. **Sub-module switching time** — click on "MEDDIC" to painted content.
 *   2. **Chunk preloading success** — whether hover/idle warming actually won
 *      the race with the click, and how often a chunk fetch fails outright.
 *
 * This module measures both in the browser, keeps a rolling local buffer (so
 * the numbers are visible in dev without a backend) and batches them to the
 * gateway RUM endpoint in production. Everything is best-effort: benchmarking
 * must never slow down, block or break the interaction it is measuring.
 *
 * Privacy: samples carry chunk families, timings, coarse connection class and
 * an ephemeral per-tab session id. No URLs, no record ids, no user identity.
 */

import { BUILD_VERSION } from "@/lib/build-info";

export type PerfSampleKind = "switch" | "chunk";
export type ChunkSource = "preload" | "navigation" | "lazy";
export type ChunkOutcome = "success" | "failure";

export interface PerfSample {
  kind: PerfSampleKind;
  module: string;
  submodule?: string;
  durationMs: number;
  timestamp: number;
  warm?: boolean;
  source?: ChunkSource;
  outcome?: ChunkOutcome;
  attempts?: number;
  offline?: boolean;
  effectiveType?: string;
  buildVersion?: string;
  sessionId?: string;
}

/** Interaction budget: above this a switch stops feeling like a direct response. */
export const SWITCH_BUDGET_MS = 1_000;

const ENDPOINT = "/api/_rum/module-perf";
const LOCAL_BUFFER_LIMIT = 300;
const FLUSH_AFTER = 20;
const FLUSH_INTERVAL_MS = 30_000;
/**
 * Sample rate in production. Switching modules is a very frequent interaction;
 * 25% of sessions is far more than enough for stable p95s while keeping the
 * beacon volume negligible. Dev always reports so local work is measurable.
 */
const PROD_SESSION_SAMPLE_RATE = 0.25;

const isBrowser = typeof window !== "undefined";

function now(): number {
  return isBrowser && typeof performance !== "undefined" ? performance.now() : Date.now();
}

function connectionInfo(): { effectiveType?: string } {
  if (!isBrowser) return {};
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return conn?.effectiveType ? { effectiveType: conn.effectiveType } : {};
}

const sessionId = isBrowser
  ? `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
  : "s_ssr";

/** Whether this tab reports to the backend. Sampled once per session. */
const reportingEnabled =
  isBrowser && (!import.meta.env.PROD || Math.random() < PROD_SESSION_SAMPLE_RATE);

/* ------------------------------------------------------------------ */
/* Local rolling buffer — always on, powers the in-app dashboard        */
/* ------------------------------------------------------------------ */

const local: PerfSample[] = [];
const pending: PerfSample[] = [];
const listeners = new Set<(sample: PerfSample) => void>();

/** Subscribe to live samples (used by the observability panel). */
export function onPerfSample(fn: (sample: PerfSample) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Every sample recorded in this tab, oldest first. */
export function getLocalSamples(): readonly PerfSample[] {
  return local;
}

function record(sample: PerfSample): void {
  local.push(sample);
  if (local.length > LOCAL_BUFFER_LIMIT) local.splice(0, local.length - LOCAL_BUFFER_LIMIT);
  for (const fn of listeners) {
    try {
      fn(sample);
    } catch {
      /* a broken subscriber must not break measurement */
    }
  }
  if (!reportingEnabled) return;
  pending.push(sample);
  if (pending.length >= FLUSH_AFTER) void flushPerfSamples();
}

/* ------------------------------------------------------------------ */
/* Transport                                                            */
/* ------------------------------------------------------------------ */

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (isBrowser ? window.location.origin : "");

/**
 * Ship whatever is buffered. Uses `sendBeacon` when available so a flush on
 * page hide survives the navigation; falls back to a keepalive fetch.
 */
export function flushPerfSamples(): void {
  if (!isBrowser || pending.length === 0) return;
  const batch = pending.splice(0, pending.length);
  const body = JSON.stringify({ samples: batch });
  const url = `${API_URL}${ENDPOINT}`;
  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }))) return;
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* telemetry is never allowed to throw into the app */
  }
}

/* ------------------------------------------------------------------ */
/* Chunk load benchmarks                                                */
/* ------------------------------------------------------------------ */

/** Chunk families whose code is already in the module cache. */
const warmFamilies = new Set<string>();

export function isChunkWarm(family: string): boolean {
  return warmFamilies.has(family);
}

export function markChunkWarm(family: string): void {
  warmFamilies.add(family);
}

/**
 * Time one dynamic import and record the outcome.
 * Returns the loader's promise untouched so callers keep their own semantics.
 */
export function measureChunkLoad<T>(
  module: string,
  source: ChunkSource,
  /** Receives an attempt reporter so retries are visible in the benchmark. */
  loader: (onAttempt: (attempt: number) => void) => Promise<T>,
): Promise<T> {
  const started = now();
  let attempts = 1;
  const finish = (outcome: ChunkOutcome) => {
    record({
      kind: "chunk",
      module,
      source,
      outcome,
      durationMs: Math.round(now() - started),
      timestamp: Date.now(),
      offline: isBrowser && navigator.onLine === false,
      buildVersion: BUILD_VERSION,
      sessionId,
      attempts,
      ...connectionInfo(),
    });
  };

  return loader((attempt) => {
    attempts = attempt;
  }).then(
    (value) => {
      warmFamilies.add(module);
      finish("success");
      return value;
    },
    (error: unknown) => {
      finish("failure");
      throw error;
    },
  );
}

/* ------------------------------------------------------------------ */
/* Sub-module switch benchmarks                                         */
/* ------------------------------------------------------------------ */

interface PendingSwitch {
  submodule: string;
  module: string;
  startedAt: number;
  warm: boolean;
}

let pendingSwitch: PendingSwitch | null = null;

/**
 * Called the moment the user commits to a sub-module (click / keyboard).
 * `warm` records whether the chunk was already cached, which is what makes the
 * preloading success rate meaningful rather than just a fetch counter.
 */
export function beginModuleSwitch(submodule: string, family: string): void {
  pendingSwitch = {
    submodule,
    module: family,
    startedAt: now(),
    warm: warmFamilies.has(family),
  };
}

/**
 * Called once the new module has actually painted. Measuring at paint (rather
 * than at import resolve) is the number the user experiences.
 */
export function endModuleSwitch(submodule: string): void {
  const open = pendingSwitch;
  if (!open || open.submodule !== submodule) return;
  pendingSwitch = null;
  record({
    kind: "switch",
    module: open.module,
    submodule,
    warm: open.warm,
    durationMs: Math.round(now() - open.startedAt),
    timestamp: Date.now(),
    buildVersion: BUILD_VERSION,
    sessionId,
    ...connectionInfo(),
  });
}

/** Drop an in-flight measurement (e.g. the user navigated away mid-load). */
export function cancelModuleSwitch(): void {
  pendingSwitch = null;
}

/* ------------------------------------------------------------------ */
/* Local aggregates (dashboard fallback when the gateway is unreachable)*/
/* ------------------------------------------------------------------ */

export interface LocalPerfSummary {
  switches: number;
  p50Ms: number;
  p95Ms: number;
  withinBudgetRatio: number;
  warmRatio: number;
  preloadAttempts: number;
  preloadSuccessRatio: number;
  chunkLoads: number;
  chunkFailures: number;
  modules: Array<{ module: string; switches: number; p50Ms: number; p95Ms: number; warmRatio: number }>;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[idx]!);
}

export function summarizeLocalSamples(samples: readonly PerfSample[] = local): LocalPerfSummary {
  const switches = samples.filter((s) => s.kind === "switch");
  const chunks = samples.filter((s) => s.kind === "chunk");
  const preloads = chunks.filter((c) => c.source === "preload");
  const durations = switches.map((s) => s.durationMs);
  const families = Array.from(new Set(switches.map((s) => s.module)));

  return {
    switches: switches.length,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    withinBudgetRatio: switches.length
      ? switches.filter((s) => s.durationMs <= SWITCH_BUDGET_MS).length / switches.length
      : 0,
    warmRatio: switches.length ? switches.filter((s) => s.warm).length / switches.length : 0,
    preloadAttempts: preloads.length,
    preloadSuccessRatio: preloads.length
      ? preloads.filter((c) => c.outcome === "success").length / preloads.length
      : 0,
    chunkLoads: chunks.length,
    chunkFailures: chunks.filter((c) => c.outcome === "failure").length,
    modules: families
      .map((module) => {
        const ms = switches.filter((s) => s.module === module);
        return {
          module,
          switches: ms.length,
          p50Ms: percentile(ms.map((s) => s.durationMs), 50),
          p95Ms: percentile(ms.map((s) => s.durationMs), 95),
          warmRatio: ms.filter((s) => s.warm).length / ms.length,
        };
      })
      .sort((a, b) => b.p95Ms - a.p95Ms),
  };
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                            */
/* ------------------------------------------------------------------ */

if (isBrowser) {
  // Flush on tab hide (the only reliable "session end" signal on mobile) and
  // on a slow timer so long-lived tabs still report.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPerfSamples();
  });
  window.addEventListener("pagehide", flushPerfSamples);
  window.setInterval(flushPerfSamples, FLUSH_INTERVAL_MS);

  // Escape hatch for support: `__perf()` in the console prints this tab's
  // benchmarks without needing access to the admin dashboard.
  (window as unknown as Record<string, unknown>).__perf = () => summarizeLocalSamples();
}
