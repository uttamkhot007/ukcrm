/**
 * Real-user performance benchmarks for the frontend shell.
 *
 * Synthetic timings taken on a developer laptop say very little about what a
 * salesperson on hotel wifi actually waits for. This collector receives two
 * kinds of samples from real browsers and turns them into benchmarks we can
 * hold ourselves to:
 *
 *   - `switch` — how long a sub-module takes from click to painted content,
 *     split by whether the chunk was already warm in the module cache.
 *   - `chunk`  — every dynamic import attempt (speculative preload or a real
 *     navigation load), with its outcome, so we can measure preload *success
 *     rate* and how often warming actually pays off.
 *
 * Everything is kept in a bounded in-memory ring buffer with a time window,
 * exactly like the trace collector: benchmarks are an operational signal, not
 * an audit log, and they must never be able to grow without bound or slow the
 * request path down.
 */

import { EventEmitter } from 'node:events';

export type RumSampleKind = 'switch' | 'chunk';
export type ChunkSource = 'preload' | 'navigation' | 'lazy';
export type ChunkOutcome = 'success' | 'failure';

/** A single browser-reported measurement. */
export interface RumSample {
  kind: RumSampleKind;
  /** Chunk family, e.g. "sales" — never the full sub-module id with PII risk. */
  module: string;
  /** Sub-module id when known, e.g. "sales-leads". */
  submodule?: string;
  /** Milliseconds the user waited. */
  durationMs: number;
  /** Client clock, normalised on ingest to guard against skewed devices. */
  timestamp: number;
  /** switch samples: was the chunk already in the module cache? */
  warm?: boolean;
  /** chunk samples */
  source?: ChunkSource;
  outcome?: ChunkOutcome;
  attempts?: number;
  offline?: boolean;
  /** navigator.connection.effectiveType, e.g. "4g" — coarse, non-identifying. */
  effectiveType?: string;
  /** Build the browser was running, so a regression can be pinned to a deploy. */
  buildVersion?: string;
  tenantId?: string;
  sessionId?: string;
}

export interface ModuleBenchmark {
  module: string;
  /** Painted-content latency for this module. */
  switches: number;
  p50Ms: number;
  p75Ms: number;
  p95Ms: number;
  maxMs: number;
  /** Share of switches that met the interaction budget. */
  withinBudgetRatio: number;
  /** Switches served from an already-warm chunk. */
  warmRatio: number;
  warmP95Ms: number;
  coldP95Ms: number;
  /** Chunk loading for this module. */
  chunkLoads: number;
  chunkFailures: number;
  preloadAttempts: number;
  preloadSuccessRatio: number;
}

export interface RumStats {
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
    /** Preload success across every speculative warm attempt. */
    preloadAttempts: number;
    preloadSuccessRatio: number;
    /** All chunk fetches, speculative or not. */
    chunkLoads: number;
    chunkFailureRatio: number;
    offlineFailures: number;
    /** Mean retry attempts on chunk loads that eventually succeeded. */
    avgAttempts: number;
    sessions: number;
  };
  modules: ModuleBenchmark[];
  /** Modules whose p95 breaches the budget — the actionable worklist. */
  regressions: Array<{ module: string; p95Ms: number; budgetMs: number; switches: number }>;
  byConnection: Array<{ effectiveType: string; switches: number; p95Ms: number }>;
  byBuild: Array<{ buildVersion: string; switches: number; p95Ms: number; chunkFailures: number }>;
}

const MAX_SAMPLES = 20_000;
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
/**
 * Interaction budget for a sub-module switch. 1s is the classic threshold for
 * "still feels like a direct response to my click"; above it users report the
 * app as slow, which is exactly the complaint these benchmarks exist to catch.
 */
export const SWITCH_BUDGET_MS = 1_000;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[idx]!);
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

/** Keep untrusted client input inside sane bounds before it reaches a buffer. */
function sanitize(raw: unknown, now: number): RumSample | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const kind = s['kind'];
  if (kind !== 'switch' && kind !== 'chunk') return null;

  const module = typeof s['module'] === 'string' ? s['module'].slice(0, 64) : '';
  if (!module) return null;

  const duration = Number(s['durationMs']);
  if (!Number.isFinite(duration) || duration < 0) return null;

  const ts = Number(s['timestamp']);
  // Clamp skewed client clocks into the retention window so a device set to
  // 2035 cannot pin a sample at the head of the buffer forever.
  const timestamp =
    Number.isFinite(ts) && ts > now - MAX_WINDOW_MS && ts <= now + 60_000 ? ts : now;

  const sample: RumSample = {
    kind,
    module,
    durationMs: Math.min(Math.round(duration), 120_000),
    timestamp,
  };

  if (typeof s['submodule'] === 'string') sample.submodule = s['submodule'].slice(0, 96);
  if (typeof s['warm'] === 'boolean') sample.warm = s['warm'];
  if (s['source'] === 'preload' || s['source'] === 'navigation' || s['source'] === 'lazy') {
    sample.source = s['source'];
  }
  if (s['outcome'] === 'success' || s['outcome'] === 'failure') sample.outcome = s['outcome'];
  if (Number.isFinite(Number(s['attempts']))) {
    sample.attempts = Math.min(Math.max(Math.round(Number(s['attempts'])), 1), 20);
  }
  if (typeof s['offline'] === 'boolean') sample.offline = s['offline'];
  if (typeof s['effectiveType'] === 'string') sample.effectiveType = s['effectiveType'].slice(0, 16);
  if (typeof s['buildVersion'] === 'string') sample.buildVersion = s['buildVersion'].slice(0, 64);
  if (typeof s['tenantId'] === 'string') sample.tenantId = s['tenantId'].slice(0, 64);
  if (typeof s['sessionId'] === 'string') sample.sessionId = s['sessionId'].slice(0, 64);

  return sample;
}

export class RumCollector extends EventEmitter {
  private samples: RumSample[] = [];

  /** Ingest a batch from one browser. Returns how many samples were kept. */
  ingest(raw: unknown[], now = Date.now()): number {
    let accepted = 0;
    for (const item of raw) {
      const sample = sanitize(item, now);
      if (!sample) continue;
      this.samples.push(sample);
      accepted += 1;
    }
    if (this.samples.length > MAX_SAMPLES) {
      this.samples = this.samples.slice(this.samples.length - MAX_SAMPLES);
    }
    if (accepted > 0) this.emit('samples', accepted);
    return accepted;
  }

  /** Samples inside the window, optionally scoped to one tenant. */
  private window(windowMs: number, tenantId?: string, now = Date.now()): RumSample[] {
    const cutoff = now - windowMs;
    return this.samples.filter(
      (s) => s.timestamp >= cutoff && (!tenantId || s.tenantId === tenantId),
    );
  }

  stats(
    options: { windowMs?: number; tenantId?: string; budgetMs?: number; now?: number } = {},
  ): RumStats {
    const now = options.now ?? Date.now();
    const windowMs = Math.min(Math.max(options.windowMs ?? 15 * 60_000, 60_000), MAX_WINDOW_MS);
    const budgetMs = options.budgetMs ?? SWITCH_BUDGET_MS;
    const scoped = this.window(windowMs, options.tenantId, now);

    const switches = scoped.filter((s) => s.kind === 'switch');
    const chunks = scoped.filter((s) => s.kind === 'chunk');
    const allDurations = switches.map((s) => s.durationMs).sort((a, b) => a - b);
    const preloads = chunks.filter((c) => c.source === 'preload');
    const succeededChunks = chunks.filter((c) => c.outcome === 'success');

    const moduleIds = Array.from(new Set(scoped.map((s) => s.module))).sort();
    const modules: ModuleBenchmark[] = moduleIds.map((module) => {
      const ms = switches.filter((s) => s.module === module);
      const durations = ms.map((s) => s.durationMs).sort((a, b) => a - b);
      const warm = ms.filter((s) => s.warm);
      const cold = ms.filter((s) => !s.warm);
      const cs = chunks.filter((c) => c.module === module);
      const cp = cs.filter((c) => c.source === 'preload');
      return {
        module,
        switches: ms.length,
        p50Ms: percentile(durations, 50),
        p75Ms: percentile(durations, 75),
        p95Ms: percentile(durations, 95),
        maxMs: durations.length ? durations[durations.length - 1]! : 0,
        withinBudgetRatio: ratio(ms.filter((s) => s.durationMs <= budgetMs).length, ms.length),
        warmRatio: ratio(warm.length, ms.length),
        warmP95Ms: percentile(
          warm.map((s) => s.durationMs).sort((a, b) => a - b),
          95,
        ),
        coldP95Ms: percentile(
          cold.map((s) => s.durationMs).sort((a, b) => a - b),
          95,
        ),
        chunkLoads: cs.length,
        chunkFailures: cs.filter((c) => c.outcome === 'failure').length,
        preloadAttempts: cp.length,
        preloadSuccessRatio: ratio(cp.filter((c) => c.outcome === 'success').length, cp.length),
      };
    });

    const byConnection = Array.from(
      switches.reduce((acc, s) => {
        const key = s.effectiveType ?? 'unknown';
        (acc.get(key) ?? acc.set(key, []).get(key)!).push(s.durationMs);
        return acc;
      }, new Map<string, number[]>()),
    )
      .map(([effectiveType, values]) => ({
        effectiveType,
        switches: values.length,
        p95Ms: percentile(values.sort((a, b) => a - b), 95),
      }))
      .sort((a, b) => b.switches - a.switches);

    const buildKeys = Array.from(new Set(scoped.map((s) => s.buildVersion ?? 'unknown')));
    const byBuild = buildKeys
      .map((buildVersion) => {
        const bs = switches.filter((s) => (s.buildVersion ?? 'unknown') === buildVersion);
        return {
          buildVersion,
          switches: bs.length,
          p95Ms: percentile(bs.map((s) => s.durationMs).sort((a, b) => a - b), 95),
          chunkFailures: chunks.filter(
            (c) => (c.buildVersion ?? 'unknown') === buildVersion && c.outcome === 'failure',
          ).length,
        };
      })
      .sort((a, b) => b.switches - a.switches);

    return {
      generatedAt: now,
      windowMs,
      samples: scoped.length,
      budgetMs,
      overall: {
        switches: switches.length,
        p50Ms: percentile(allDurations, 50),
        p75Ms: percentile(allDurations, 75),
        p95Ms: percentile(allDurations, 95),
        withinBudgetRatio: ratio(
          switches.filter((s) => s.durationMs <= budgetMs).length,
          switches.length,
        ),
        warmRatio: ratio(switches.filter((s) => s.warm).length, switches.length),
        preloadAttempts: preloads.length,
        preloadSuccessRatio: ratio(
          preloads.filter((c) => c.outcome === 'success').length,
          preloads.length,
        ),
        chunkLoads: chunks.length,
        chunkFailureRatio: ratio(chunks.filter((c) => c.outcome === 'failure').length, chunks.length),
        offlineFailures: chunks.filter((c) => c.outcome === 'failure' && c.offline).length,
        avgAttempts:
          succeededChunks.length === 0
            ? 0
            : Number(
                (
                  succeededChunks.reduce((sum, c) => sum + (c.attempts ?? 1), 0) /
                  succeededChunks.length
                ).toFixed(2),
              ),
        sessions: new Set(scoped.map((s) => s.sessionId).filter(Boolean)).size,
      },
      modules: modules.sort((a, b) => b.p95Ms - a.p95Ms),
      regressions: modules
        .filter((m) => m.switches >= 3 && m.p95Ms > budgetMs)
        .map((m) => ({ module: m.module, p95Ms: m.p95Ms, budgetMs, switches: m.switches }))
        .sort((a, b) => b.p95Ms - a.p95Ms),
      byConnection,
      byBuild,
    };
  }

  /** Test/ops helper. */
  reset(): void {
    this.samples = [];
  }

  get size(): number {
    return this.samples.length;
  }
}

export const rumCollector = new RumCollector();
