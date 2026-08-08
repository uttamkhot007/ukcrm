/**
 * Central scheduler for speculative chunk preloading.
 *
 * Every hover, focus and idle warm-up in the app funnels through here instead
 * of firing `import()` directly. Unmanaged preloading has two failure modes we
 * kept hitting:
 *
 *   1. **Sweep storms** — dragging the pointer down the sidebar fires a
 *      preload for every item it crosses, so a dozen chunks download for one
 *      the user wanted. A short dwell delay per trigger means only *intent*
 *      (a pause, a focus, a press) starts a download; a sweep cancels itself.
 *   2. **Bandwidth contention** — speculative chunks compete with the data
 *      fetches the user is actually waiting on. A hard concurrency cap, tuned
 *      to the connection, keeps warm-ups in the background where they belong.
 *
 * Requests are prioritised, so a pointer-down (the user is committing) always
 * jumps ahead of idle group-warming that happens to be queued.
 */

import { shouldSkipSpeculativePreload } from "@/lib/chunk-retry";

export type PreloadTrigger = "pointer" | "focus" | "hover" | "visible" | "idle";

interface TriggerPolicy {
  /** Lower runs first. */
  priority: number;
  /**
   * How long the intent must persist before we spend bandwidth. Pointer-down
   * is a commitment so it fires immediately; hover needs a genuine pause.
   */
  dwellMs: number;
}

const POLICY: Record<PreloadTrigger, TriggerPolicy> = {
  // The user is pressing — the navigation is already happening.
  pointer: { priority: 0, dwellMs: 0 },
  // Keyboard/AT navigation. Slightly delayed so arrow-keying across a tab bar
  // doesn't queue every tab it passes through.
  focus: { priority: 1, dwellMs: 120 },
  // Classic hover intent: long enough to exclude a sweep, short enough that a
  // deliberate hover still wins the race against the click.
  hover: { priority: 2, dwellMs: 90 },
  // Entered the viewport — likely next, but not yet intended.
  visible: { priority: 3, dwellMs: 250 },
  // Background warming of likely next-steps.
  idle: { priority: 4, dwellMs: 0 },
};

/** Never let speculative work occupy more than a few sockets. */
const MAX_CONCURRENCY = 3;
/**
 * Bound the backlog. A deep queue is worthless: by the time a low-priority
 * entry runs, the user has moved on and it is just wasted bandwidth.
 */
const MAX_QUEUE = 8;

interface QueueEntry {
  key: string;
  loader: () => Promise<unknown>;
  priority: number;
  trigger: PreloadTrigger;
  /** Monotonic counter so equal priorities stay FIFO. */
  seq: number;
}

const queue: QueueEntry[] = [];
const pendingDwell = new Map<string, { timer: number; priority: number }>();
const inflight = new Map<string, Promise<unknown>>();
const done = new Set<string>();
let seq = 0;

/** How many parallel speculative fetches this connection can afford. */
export function preloadConcurrency(): number {
  if (typeof navigator === "undefined") return MAX_CONCURRENCY;
  const conn = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  if (!conn) return MAX_CONCURRENCY;
  if (conn.saveData) return 0;
  switch (conn.effectiveType) {
    case "slow-2g":
    case "2g":
      return 0;
    case "3g":
      // Enough to warm the single most likely next chunk, nothing more.
      return 1;
    default:
      return MAX_CONCURRENCY;
  }
}

function pump() {
  const limit = preloadConcurrency();
  while (inflight.size < limit && queue.length > 0) {
    const entry = queue.shift()!;
    if (done.has(entry.key) || inflight.has(entry.key)) continue;

    const task = entry
      .loader()
      .then(() => {
        done.add(entry.key);
      })
      // Speculative failures are non-events: the real navigation will retry.
      .catch(() => undefined)
      .finally(() => {
        inflight.delete(entry.key);
        pump();
      });

    inflight.set(entry.key, task);
  }
}

function enqueue(entry: QueueEntry) {
  const existing = queue.findIndex((q) => q.key === entry.key);
  if (existing !== -1) {
    // Already queued: keep the strongest intent seen so far rather than
    // adding a duplicate download.
    if (queue[existing]!.priority <= entry.priority) return;
    queue.splice(existing, 1);
  }

  queue.push(entry);
  queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);

  // Drop the least-wanted work rather than growing an unbounded backlog.
  if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;

  pump();
}

/**
 * Request a speculative load of `key`, honouring the trigger's dwell delay,
 * the queue priority and the connection-aware concurrency cap.
 *
 * Safe to call on every pointer event: repeat calls for a key that is already
 * loaded, in flight, or queued at an equal-or-higher priority are no-ops.
 */
export function schedulePreload(
  key: string,
  loader: () => Promise<unknown>,
  trigger: PreloadTrigger = "hover",
): void {
  if (done.has(key) || inflight.has(key)) return;
  if (shouldSkipSpeculativePreload() || preloadConcurrency() === 0) return;

  const policy = POLICY[trigger];
  const pending = pendingDwell.get(key);
  if (pending) {
    // A stronger intent arrived mid-dwell (hover → pointer-down): restart with
    // the shorter delay instead of waiting out the weaker one.
    if (pending.priority <= policy.priority) return;
    clearTimeout(pending.timer);
    pendingDwell.delete(key);
  }

  const start = () => {
    pendingDwell.delete(key);
    enqueue({ key, loader, priority: policy.priority, trigger, seq: seq++ });
  };

  if (policy.dwellMs === 0) {
    start();
    return;
  }

  const timer = setTimeout(start, policy.dwellMs) as unknown as number;
  pendingDwell.set(key, { timer, priority: policy.priority });
}

/**
 * Withdraw intent for `key` — the pointer left before the dwell elapsed, or a
 * focused element was blurred. Downloads already started are left alone; the
 * bytes are paid for either way.
 */
export function cancelPreload(key: string): void {
  const pending = pendingDwell.get(key);
  if (pending) {
    clearTimeout(pending.timer);
    pendingDwell.delete(key);
  }
  const queued = queue.findIndex((q) => q.key === key);
  if (queued !== -1) queue.splice(queued, 1);
}

/**
 * Queue a batch of background warm-ups when the browser next goes idle.
 * Runs at the lowest priority, so any hover or click immediately preempts it.
 */
export function schedulePreloadWhenIdle(
  entries: Array<{ key: string; loader: () => Promise<unknown> }>,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  let handle: number | undefined;
  let timeout: number | undefined;
  let cancelled = false;

  const run = () => {
    if (cancelled) return;
    for (const entry of entries) schedulePreload(entry.key, entry.loader, "idle");
  };

  const schedule = () => {
    if (cancelled) return;
    if (shouldSkipSpeculativePreload()) {
      // Retry once connectivity returns rather than dropping the warm-up.
      window.addEventListener("online", schedule, { once: true });
      return;
    }
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (idle) handle = idle(run, { timeout: 3000 });
    else timeout = window.setTimeout(run, 1200);
  };

  schedule();

  return () => {
    cancelled = true;
    window.removeEventListener("online", schedule);
    if (handle !== undefined) window.cancelIdleCallback?.(handle);
    if (timeout !== undefined) window.clearTimeout(timeout);
    for (const entry of entries) cancelPreload(entry.key);
  };
}

/** Mark a chunk as loaded so no trigger ever schedules it again. */
export function markPreloaded(key: string): void {
  done.add(key);
  cancelPreload(key);
}

export function isPreloaded(key: string): boolean {
  return done.has(key);
}

/** Introspection for tests and the observability dashboard. */
export function preloadSchedulerState() {
  return {
    inflight: inflight.size,
    queued: queue.length,
    pending: pendingDwell.size,
    loaded: done.size,
    concurrency: preloadConcurrency(),
  };
}

/** Test-only reset. */
export function __resetPreloadScheduler() {
  for (const { timer } of pendingDwell.values()) clearTimeout(timer);
  pendingDwell.clear();
  queue.length = 0;
  inflight.clear();
  done.clear();
  seq = 0;
}
