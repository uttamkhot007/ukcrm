/**
 * Resilient dynamic-import loading for lazily-split modules.
 *
 * Sub-modules are separate chunks fetched over the network the first time they
 * are opened. On a flaky connection, a train tunnel, or a laptop that just woke
 * up, that fetch fails and React's `lazy` surfaces it as a hard error — the
 * whole module area blanks out for what is really a transient hiccup.
 *
 * This module wraps every chunk import with:
 *   - bounded exponential backoff with jitter,
 *   - an explicit timeout so a stalled socket doesn't hang forever,
 *   - offline awareness: while `navigator.onLine` is false we wait for the
 *     `online` event instead of burning retries,
 *   - stale-deploy detection: after a new release the old chunk URLs 404
 *     forever, so retrying is pointless — we reload onto the fresh build once.
 */

export class ChunkLoadError extends Error {
  readonly cause?: unknown;
  readonly offline: boolean;

  constructor(message: string, options?: { cause?: unknown; offline?: boolean }) {
    super(message);
    this.name = "ChunkLoadError";
    this.cause = options?.cause;
    this.offline = options?.offline ?? false;
  }
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Resolves as soon as the browser reports connectivity again (or after `maxWait`). */
export function waitForOnline(maxWait = 20_000): Promise<void> {
  if (typeof window === "undefined" || !isOffline()) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("online", done);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, maxWait);
    window.addEventListener("online", done);
  });
}

/**
 * A chunk request that fails because the deployed bundle changed underneath us.
 * Retrying cannot help — the file genuinely no longer exists on the server.
 */
export function isStaleDeployError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /'text\/html' is not a valid JavaScript MIME type/i.test(message)
  );
}

/**
 * Reload onto the current build when chunks 404 after a deploy. This shares
 * the release controller's arbiter, preventing a simultaneous resume check
 * and chunk failure from launching two competing navigations.
 */
export function recoverFromStaleDeploy(): boolean {
  if (typeof window === "undefined") return false;
  void import("@/lib/build-cache-strategy").then(({ requestReleaseReload }) => {
    requestReleaseReload("chunk-load-failure", { clearCaches: true });
  });
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ChunkLoadError(`Loading this section timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RetryImportOptions {
  /** Number of retries after the first attempt. Default 3. */
  retries?: number;
  /** Base backoff in ms, doubled each attempt. Default 400. */
  baseDelay?: number;
  /** Per-attempt timeout in ms. Default 15000. `0` disables it. */
  timeout?: number;
  /** Label used in the surfaced error message. */
  label?: string;
  /** Set false for speculative preloads that should not reload the page. */
  recoverStaleDeploy?: boolean;
  /**
   * Called before every attempt with the 1-based attempt number. Used by the
   * performance benchmarks to report how many retries a chunk really needed.
   */
  onAttempt?: (attempt: number) => void;
}

/**
 * Run a dynamic `import()` with retries, timeout and offline awareness.
 * Rejects with a `ChunkLoadError` once every attempt is exhausted.
 */
export async function retryImport<T>(
  loader: () => Promise<T>,
  options: RetryImportOptions = {},
): Promise<T> {
  const {
    retries = 3,
    baseDelay = 400,
    timeout = 15_000,
    label = "this section",
    recoverStaleDeploy = true,
    onAttempt,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (isOffline()) {
      // Don't spend an attempt while the device is known to be offline.
      await waitForOnline();
      if (isOffline() && attempt === retries) {
        throw new ChunkLoadError(`You appear to be offline, so ${label} could not be loaded.`, {
          cause: lastError,
          offline: true,
        });
      }
    }

    try {
      onAttempt?.(attempt + 1);
      return await withTimeout(loader(), timeout);
    } catch (error) {
      lastError = error;

      if (recoverStaleDeploy && isStaleDeployError(error) && !isOffline()) {
        // A newer build replaced these files; reloading is the only real fix.
        if (recoverFromStaleDeploy()) {
          // Keep the promise pending while the page navigates away.
          await sleep(10_000);
        }
      }

      if (attempt === retries) break;

      const backoff = baseDelay * 2 ** attempt;
      const jitter = Math.random() * baseDelay;
      await sleep(backoff + jitter);
    }
  }

  throw new ChunkLoadError(
    isOffline()
      ? `You appear to be offline, so ${label} could not be loaded.`
      : `${label.charAt(0).toUpperCase()}${label.slice(1)} could not be loaded. Check your connection and try again.`,
    { cause: lastError, offline: isOffline() },
  );
}

/**
 * True when the browser reports a connection too slow/metered to justify
 * speculative preloading. Real loads always go ahead regardless.
 */
export function shouldSkipSpeculativePreload(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isOffline()) return true;
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
}
