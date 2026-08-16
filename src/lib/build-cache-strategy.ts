/**
 * Build-aware client caching strategy.
 *
 * Goal: a hard refresh — or simply coming back to the tab days later — must
 * always end up running the newest deployed bundle, never a cached snapshot.
 *
 * Three parts:
 *  1. `purgeCachesOnNewBuild()` — the moment the running bundle's build id
 *     differs from the one recorded on the last visit, every Cache Storage
 *     bucket and every build-scoped localStorage entry from the old build is
 *     dropped. Content-hashed assets are safe to keep in the HTTP cache; the
 *     app-level caches are not.
 *  2. `watchServedBuild()` — polls the served `index.html` with
 *     `cache: "no-store"` (on load, on tab focus, and on an interval) and
 *     compares its build meta with the running bundle. When the server is
 *     ahead, the tab is running a stale shell.
 *  3. A single, guarded auto-reload per detected build id, so a returning
 *     visitor silently lands on the latest assets without ever looping.
 */

import { BUILD_COMMIT, BUILD_TIME, BUILD_VERSION } from "@/lib/build-info";
import { purgeObsoletePresentationState } from "@/lib/ui-persistence";

const LAST_BUILD_KEY = "nexus:last-build-id";
const RELOADED_FOR_KEY = "nexus:reloaded-for-build";
const MAX_RELOAD_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const MIN_POLL_GAP_MS = 30 * 1000;
const RESUME_GAP_MS = 60 * 1000;
const COHERENCE_EVENT = "nexus:release-coherence-updated";

export const RUNNING_BUILD_ID = `${BUILD_VERSION}|${BUILD_COMMIT}|${BUILD_TIME}`;

export type ServedBuild = {
  buildTime: string | null;
  commit: string | null;
  id: string | null;
};

export const NEW_BUILD_EVENT = "nexus:new-build-available";

export type ReleaseCheckTrigger = "boot" | "interval" | "visible" | "focus" | "online" | "pageshow" | "resume";
export type ReleaseCoherenceDiagnostic = {
  trigger: ReleaseCheckTrigger;
  runningId: string;
  servedId: string | null;
  checkedAt: string;
  bfcache: boolean;
  decision: "current" | "preserved" | "reload" | "unverifiable" | "failed";
  reason?: string;
};

const diagnostics: ReleaseCoherenceDiagnostic[] = [];

function recordDiagnostic(value: ReleaseCoherenceDiagnostic) {
  diagnostics.push(value);
  if (diagnostics.length > 20) diagnostics.shift();
  try {
    sessionStorage.setItem("nexus:release-coherence", JSON.stringify(diagnostics));
    window.dispatchEvent(new CustomEvent(COHERENCE_EVENT));
  } catch { /* diagnostics are best effort */ }
}

export function getReleaseCoherenceDiagnostics(): ReleaseCoherenceDiagnostic[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem("nexus:release-coherence") ?? "[]") as ReleaseCoherenceDiagnostic[];
    return Array.isArray(saved) ? saved.slice(-20).reverse() : [];
  } catch {
    return diagnostics.slice().reverse();
  }
}

export function subscribeReleaseCoherence(fn: () => void): () => void {
  window.addEventListener(COHERENCE_EVENT, fn);
  return () => window.removeEventListener(COHERENCE_EVENT, fn);
}

function safeLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Drop app-managed caches whenever the running build differs from the build
 * recorded on the previous visit. Returns true when a purge happened.
 */
export async function purgeCachesOnNewBuild(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const store = safeLocal();
  const previous = store?.getItem(LAST_BUILD_KEY) ?? null;
  if (previous === RUNNING_BUILD_ID) return false;

  try {
    store?.setItem(LAST_BUILD_KEY, RUNNING_BUILD_ID);
    store?.removeItem(RELOADED_FOR_KEY);
  } catch {
    /* ignore */
  }

  // Cache Storage: nothing in this app writes to it, but old service-worker
  // era buckets can still be serving ancient HTML/JS.
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch {
    /* ignore */
  }

  // Build-scoped app storage from the previous build.
  try {
    if (store) {
      purgeObsoletePresentationState(store);
      const stale: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key) continue;
        if (key.startsWith("nexus-query-cache") || key.startsWith("nexus:build-scoped:")) {
          stale.push(key);
        }
      }
      stale.forEach((k) => store.removeItem(k));
    }
  } catch {
    /* ignore */
  }

  return true;
}

/** Read the build identity the server is currently handing out. */
export async function fetchServedBuild(): Promise<ServedBuild> {
  // A unique probe URL prevents non-compliant intermediary proxies from
  // replaying an old index response. This query is never used for navigation,
  // so it cannot create stale browser history or shell cache entries.
  const url = `${window.location.origin}/index.html?release-probe=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store", credentials: "omit" });
  if (!res.ok) throw new Error(`index.html responded ${res.status}`);
  const html = await res.text();
  const read = (name: string) =>
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ?? null;

  const buildTime = read("build-time");
  const commit = read("build-commit");
  const id = buildTime || commit ? `${commit ?? "?"}|${buildTime ?? "?"}` : null;
  return { buildTime, commit, id };
}

export function isServedBuildDifferent(served: ServedBuild): boolean {
  if (!served.id) return false;
  // Unreplaced placeholders (dev server) never count as a mismatch.
  if (served.buildTime?.startsWith("__") || served.commit?.startsWith("__")) return false;

  if (served.commit && BUILD_COMMIT !== "dev" && served.commit !== BUILD_COMMIT) return true;
  return Boolean(served.buildTime && served.buildTime !== BUILD_TIME);
}

export type ServedBuildRelation = "same" | "newer" | "older" | "different" | "unknown";

/* ------------------------------------------------------------------ *
 * Release floor — the hard "never fall back to an old view" guarantee.
 *
 * Every release identity this browser has ever *successfully run or seen
 * served* is remembered as a monotonic floor (highest build time wins).
 * If the bundle that boots is older than that floor, the browser handed us
 * a stale shell (HTTP cache, bfcache, proxy, or a lagging task) and we
 * refuse to render it: caches are purged and the page is reloaded with a
 * cache-busting probe until a build at or above the floor is served.
 * ------------------------------------------------------------------ */

const RELEASE_FLOOR_KEY = "nexus:release-floor";

type ReleaseFloor = { time: number; id: string };

function readReleaseFloor(): ReleaseFloor | null {
  try {
    const raw = safeLocal()?.getItem(RELEASE_FLOOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReleaseFloor>;
    return typeof parsed.time === "number" && Number.isFinite(parsed.time) && typeof parsed.id === "string"
      ? { time: parsed.time, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

/** Raise the floor when a newer release identity is observed. */
export function recordReleaseObservation(buildTime: string | null, id: string | null): void {
  if (!buildTime || !id || buildTime.startsWith("__")) return;
  const time = Date.parse(buildTime);
  if (!Number.isFinite(time)) return;
  const current = readReleaseFloor();
  if (current && current.time >= time) return;
  try {
    safeLocal()?.setItem(RELEASE_FLOOR_KEY, JSON.stringify({ time, id } satisfies ReleaseFloor));
  } catch {
    /* ignore */
  }
}

/** True when the bundle currently executing predates a release we already ran. */
export function isRunningBuildBelowFloor(): boolean {
  if (BUILD_COMMIT === "dev") return false;
  const floor = readReleaseFloor();
  if (!floor) return false;
  const running = Date.parse(BUILD_TIME);
  if (!Number.isFinite(running)) return false;
  return running < floor.time;
}

/**
 * Boot guard: never let an old bundle paint. Runs before the watcher so a
 * regressed shell is thrown away immediately instead of after a poll cycle.
 */
export function enforceReleaseFloor(): boolean {
  if (typeof window === "undefined") return false;
  if (!isRunningBuildBelowFloor()) {
    recordReleaseObservation(BUILD_TIME, RUNNING_BUILD_ID);
    return false;
  }
  const floor = readReleaseFloor();
  recordDiagnostic({
    trigger: "boot",
    runningId: RUNNING_BUILD_ID,
    servedId: floor?.id ?? null,
    checkedAt: new Date().toISOString(),
    bfcache: false,
    decision: "reload",
    reason: "running bundle is older than a release already seen (stale shell)",
  });
  return requestReleaseReload(floor?.id ?? "release-floor", { clearCaches: true });
}

/**
 * Compare releases directionally. A different release is not automatically a
 * newer release: during an ECS rolling deployment an ALB can briefly return an
 * older healthy task. Reloading for that response downgrades a perfectly fresh
 * tab and is the main cause of the GUI apparently reverting after inactivity.
 */
export function compareServedBuild(served: ServedBuild): ServedBuildRelation {
  if (!served.id || served.buildTime?.startsWith("__") || served.commit?.startsWith("__")) {
    return "unknown";
  }

  const servedTime = served.buildTime ? Date.parse(served.buildTime) : Number.NaN;
  const runningTime = Date.parse(BUILD_TIME);
  if (Number.isFinite(servedTime) && Number.isFinite(runningTime)) {
    if (servedTime === runningTime) return "same";
    if (servedTime > runningTime) return "newer";
    if (servedTime < runningTime) return "older";
  }
  if (served.commit && BUILD_COMMIT !== "dev" && served.commit === BUILD_COMMIT) return "same";
  return "different";
}

type ReloadRecord = { id: string; attempts: number };

function readReloadRecord(): ReloadRecord | null {
  try {
    const raw = window.sessionStorage.getItem(RELOADED_FOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReloadRecord>;
    return typeof parsed.id === "string" && typeof parsed.attempts === "number"
      ? { id: parsed.id, attempts: parsed.attempts }
      : null;
  } catch {
    return null;
  }
}

function reloadAttemptsFor(id: string): number {
  const record = readReloadRecord();
  return record?.id === id ? record.attempts : 0;
}

function markReloadAttempt(id: string): void {
  try {
    window.sessionStorage.setItem(
      RELOADED_FOR_KEY,
      JSON.stringify({ id, attempts: reloadAttemptsFor(id) + 1 } satisfies ReloadRecord),
    );
  } catch {
    /* ignore */
  }
}

let reloadInFlight = false;

/** Single reload arbiter shared by release checks and failed lazy chunks. */
export function requestReleaseReload(
  id: string,
  options: { clearCaches?: boolean } = {},
): boolean {
  if (typeof window === "undefined" || reloadInFlight) return false;
  if (reloadAttemptsFor(id) >= MAX_RELOAD_ATTEMPTS) return false;

  reloadInFlight = true;
  markReloadAttempt(id);
  if (options.clearCaches) {
    void import("@/lib/cache-cleanup")
      .then((module) => module.forceFreshReload())
      .catch(() => window.location.reload());
  } else {
    window.location.reload();
  }
  return true;
}

/**
 * Start watching the deployed build. When the server is ahead of this tab we
 * fire `NEW_BUILD_EVENT` and — at most once per deployed build id — reload so
 * the newest assets are fetched. The guard makes looping impossible even if a
 * CDN keeps serving a mixed set of files.
 */
export function watchServedBuild(options: { autoReload?: boolean } = {}): () => void {
  if (typeof window === "undefined") return () => {};
  const autoReload = options.autoReload ?? true;
  let disposed = false;
  let lastCheck = 0;
  let lastHeartbeat = Date.now();

  const check = async (
    trigger: ReleaseCheckTrigger = "interval",
    bfcache = false,
    force = false,
    retryAttempt = 0,
  ) => {
    if (disposed || document.visibilityState === "hidden") return;
    const now = Date.now();
    if (!force && now - lastCheck < MIN_POLL_GAP_MS) return;
    lastCheck = now;

    let served: ServedBuild;
    try {
      served = await fetchServedBuild();
    } catch {
      if (!disposed && retryAttempt === 0 && navigator.onLine) {
        window.setTimeout(() => void check(trigger, bfcache, true, 1), 400);
        return;
      }
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: null, checkedAt: new Date().toISOString(), bfcache, decision: "failed", reason: "index fetch failed" });
      return; // offline or origin blocks the read — never disrupt the session
    }
    if (disposed) return;
    if (!served.id) {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: null, checkedAt: new Date().toISOString(), bfcache, decision: "unverifiable", reason: "served build metadata missing" });
      return;
    }
    const relation = compareServedBuild(served);
    // Every verified sighting raises the floor, so this browser can never
    // silently accept an older release later on.
    recordReleaseObservation(served.buildTime, served.id);

    if (relation === "same") {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: served.id, checkedAt: new Date().toISOString(), bfcache, decision: "current" });
      return;
    }

    // Never replace a newer running UI with an older shell returned by a
    // lagging load-balancer target, proxy, or browser cache.
    if (relation === "older") {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: served.id, checkedAt: new Date().toISOString(), bfcache, decision: "preserved", reason: "server response is older than running UI; downgrade blocked" });
      return;
    }

    if (relation === "unknown" || relation === "different") {
      // Unless the running bundle itself is below the release floor — then
      // this tab is definitively the stale one and must be replaced.
      if (isRunningBuildBelowFloor()) {
        recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: served.id, checkedAt: new Date().toISOString(), bfcache, decision: "reload", reason: "running bundle is below the release floor" });
        requestReleaseReload(served.id, { clearCaches: true });
        return;
      }
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: served.id, checkedAt: new Date().toISOString(), bfcache, decision: "unverifiable", reason: "release order unavailable; reload blocked" });
      return;
    }


    window.dispatchEvent(new CustomEvent(NEW_BUILD_EVENT, { detail: served }));

    const id = served.id as string;
    const attempts = reloadAttemptsFor(id);
    if (!autoReload || attempts >= MAX_RELOAD_ATTEMPTS) {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: id, checkedAt: new Date().toISOString(), bfcache, decision: "unverifiable", reason: autoReload ? `reload limit reached (${MAX_RELOAD_ATTEMPTS})` : "auto reload disabled" });
      return;
    }
    recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: id, checkedAt: new Date().toISOString(), bfcache, decision: "reload" });
    requestReleaseReload(id, { clearCaches: true });
  };

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    const resumed = Date.now() - lastHeartbeat > RESUME_GAP_MS;
    lastHeartbeat = Date.now();
    // Returning to the app is always a coherence boundary. Never let a recent
    // background timer suppress the check the user is relying on now.
    void check(resumed ? "resume" : "visible", false, true);
  };

  const onFocus = () => void check("focus", false, true);
  const onOnline = () => void check("online", false, true);
  const onPageShow = (event: PageTransitionEvent) => void check("pageshow", event.persisted, true);

  void check("boot", false, true);
  const timer = window.setInterval(() => {
    void check("interval");
  }, POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);
  window.addEventListener("pageshow", onPageShow);

  return () => {
    disposed = true;
    window.clearInterval(timer);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Boot-time entry point used by main.tsx. */
export function installBuildCacheStrategy(): void {
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  // Hard guarantee first: if this bundle predates a release we already ran,
  // purge and reload before anything else renders against it.
  if (!isDev && enforceReleaseFloor()) return;
  void purgeCachesOnNewBuild();
  watchServedBuild({ autoReload: !isDev });
}

