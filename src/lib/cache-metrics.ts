/**
 * Cache observability for instant tab switching.
 *
 * Two caches make a sub-module switch feel instant:
 *
 *  1. **KeepAlive** — the pane stays mounted, so returning to it re-shows an
 *     existing React tree (no remount, no skeleton). A "miss" means the pane
 *     was evicted by the LRU (or never visited) and had to mount from scratch.
 *  2. **React Query** — data served from the (persisted) cache. A *fresh* hit
 *     paints with zero network; a *stale* hit paints instantly but revalidates;
 *     a miss means a spinner while the round-trip completes.
 *
 * Without numbers, "it feels fast" is an opinion. This module counts both,
 * keeps a bounded rolling window in memory, and exposes a snapshot for the
 * Platform Console. It is purely in-tab telemetry: no ids, no payloads, no
 * network traffic — so it is safe to run for every user, always on.
 */

export type PaneOutcome = "hit" | "miss";
export type QueryOutcome = "fresh" | "stale" | "miss";

export interface PaneEvent {
  type: "pane";
  module: string;
  pane: string;
  outcome: PaneOutcome;
  at: number;
}

export interface QueryEvent {
  type: "query";
  scope: string;
  outcome: QueryOutcome;
  ageMs: number;
  at: number;
}

export type CacheEvent = PaneEvent | QueryEvent;

const WINDOW_LIMIT = 500;
const events: CacheEvent[] = [];
const listeners = new Set<() => void>();
/** Panes that are currently (or were recently) mounted, per module. */
const seenPanes = new Map<string, Set<string>>();

function emit(event: CacheEvent) {
  events.push(event);
  if (events.length > WINDOW_LIMIT) events.splice(0, events.length - WINDOW_LIMIT);
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a broken subscriber must never break the app */
    }
  }
}

export function onCacheEvent(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Called when a KeepAlive pane becomes visible. `wasMounted` distinguishes a
 * re-show of a kept-alive tree (hit) from a fresh mount (miss).
 */
export function recordPaneActivation(module: string, pane: string, wasMounted: boolean) {
  let set = seenPanes.get(module);
  if (!set) {
    set = new Set();
    seenPanes.set(module, set);
  }
  const revisit = set.has(pane);
  set.add(pane);
  // The very first visit to a pane is neither a hit nor a miss — there was
  // nothing to cache yet. Only revisits tell us whether KeepAlive worked.
  if (!revisit) return;
  emit({ type: "pane", module, pane, outcome: wasMounted ? "hit" : "miss", at: Date.now() });
}

/** Called when the LRU unmounts a pane, so the next visit counts as a miss. */
export function recordPaneEviction(module: string, pane: string) {
  emit({ type: "pane", module, pane, outcome: "miss", at: Date.now() });
}

export function recordQueryRead(scope: string, outcome: QueryOutcome, ageMs: number) {
  emit({ type: "query", scope, outcome, ageMs, at: Date.now() });
}

export interface CacheStats {
  generatedAt: number;
  windowMs: number;
  pane: {
    total: number;
    hits: number;
    misses: number;
    hitRatio: number;
    byModule: Array<{ module: string; total: number; hits: number; hitRatio: number }>;
  };
  query: {
    total: number;
    fresh: number;
    stale: number;
    miss: number;
    hitRatio: number;
    freshRatio: number;
    medianAgeMs: number;
    topScopes: Array<{ scope: string; total: number; hitRatio: number }>;
  };
}

const EMPTY_STATS = (windowMs: number): CacheStats => ({
  generatedAt: Date.now(),
  windowMs,
  pane: { total: 0, hits: 0, misses: 0, hitRatio: 0, byModule: [] },
  query: {
    total: 0,
    fresh: 0,
    stale: 0,
    miss: 0,
    hitRatio: 0,
    freshRatio: 0,
    medianAgeMs: 0,
    topScopes: [],
  },
});

export function getCacheStats(windowMs = 15 * 60_000): CacheStats {
  const since = Date.now() - windowMs;
  const recent = events.filter((e) => e.at >= since);
  if (recent.length === 0) return EMPTY_STATS(windowMs);

  const stats = EMPTY_STATS(windowMs);
  const panes = new Map<string, { total: number; hits: number }>();
  const scopes = new Map<string, { total: number; hits: number }>();
  const ages: number[] = [];

  for (const e of recent) {
    if (e.type === "pane") {
      stats.pane.total += 1;
      if (e.outcome === "hit") stats.pane.hits += 1;
      else stats.pane.misses += 1;
      const m = panes.get(e.module) ?? { total: 0, hits: 0 };
      m.total += 1;
      if (e.outcome === "hit") m.hits += 1;
      panes.set(e.module, m);
    } else {
      stats.query.total += 1;
      stats.query[e.outcome] += 1;
      if (e.outcome !== "miss") ages.push(e.ageMs);
      const s = scopes.get(e.scope) ?? { total: 0, hits: 0 };
      s.total += 1;
      if (e.outcome !== "miss") s.hits += 1;
      scopes.set(e.scope, s);
    }
  }

  stats.pane.hitRatio = stats.pane.total ? stats.pane.hits / stats.pane.total : 0;
  stats.pane.byModule = [...panes.entries()]
    .map(([module, m]) => ({ module, total: m.total, hits: m.hits, hitRatio: m.hits / m.total }))
    .sort((a, b) => b.total - a.total);

  const q = stats.query;
  q.hitRatio = q.total ? (q.fresh + q.stale) / q.total : 0;
  q.freshRatio = q.total ? q.fresh / q.total : 0;
  ages.sort((a, b) => a - b);
  q.medianAgeMs = ages.length ? ages[Math.floor(ages.length / 2)] : 0;
  q.topScopes = [...scopes.entries()]
    .map(([scope, s]) => ({ scope, total: s.total, hitRatio: s.hits / s.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return stats;
}

/** Wipe the window — used by the "reset" control in the console. */
export function resetCacheStats() {
  events.length = 0;
  seenPanes.clear();
  for (const fn of listeners) fn();
}
