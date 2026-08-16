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
  decision: "current" | "reload" | "unverifiable" | "failed";
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
  const url = `${window.location.origin}/index.html`;
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

function alreadyReloadedFor(id: string): boolean {
  try {
    return window.sessionStorage.getItem(RELOADED_FOR_KEY) === id;
  } catch {
    return false;
  }
}

function markReloadedFor(id: string): void {
  try {
    window.sessionStorage.setItem(RELOADED_FOR_KEY, id);
  } catch {
    /* ignore */
  }
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

  const check = async (trigger: ReleaseCheckTrigger = "interval", bfcache = false, force = false) => {
    if (disposed || document.visibilityState === "hidden") return;
    const now = Date.now();
    if (!force && now - lastCheck < MIN_POLL_GAP_MS) return;
    lastCheck = now;

    let served: ServedBuild;
    try {
      served = await fetchServedBuild();
    } catch {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: null, checkedAt: new Date().toISOString(), bfcache, decision: "failed", reason: "index fetch failed" });
      return; // offline or origin blocks the read — never disrupt the session
    }
    if (disposed) return;
    if (!served.id) {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: null, checkedAt: new Date().toISOString(), bfcache, decision: "unverifiable", reason: "served build metadata missing" });
      return;
    }
    if (!isServedBuildDifferent(served)) {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: served.id, checkedAt: new Date().toISOString(), bfcache, decision: "current" });
      return;
    }

    window.dispatchEvent(new CustomEvent(NEW_BUILD_EVENT, { detail: served }));

    const id = served.id as string;
    if (!autoReload || alreadyReloadedFor(id)) {
      recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: id, checkedAt: new Date().toISOString(), bfcache, decision: "unverifiable", reason: autoReload ? "reload already attempted" : "auto reload disabled" });
      return;
    }
    recordDiagnostic({ trigger, runningId: RUNNING_BUILD_ID, servedId: id, checkedAt: new Date().toISOString(), bfcache, decision: "reload" });
    markReloadedFor(id);
    // Plain reload: assets are content-hashed and the HTML is sent with
    // no-store, so this pulls the new shell without inventing new URLs.
    window.location.reload();
  };

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    const resumed = Date.now() - lastHeartbeat > RESUME_GAP_MS;
    lastHeartbeat = Date.now();
    void check(resumed ? "resume" : "visible", false, resumed);
  };

  const onFocus = () => void check("focus", false, true);
  const onOnline = () => void check("online", false, true);
  const onPageShow = (event: PageTransitionEvent) => void check("pageshow", event.persisted, true);

  void check("boot", false, true);
  const timer = window.setInterval(() => {
    lastHeartbeat = Date.now();
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
  void purgeCachesOnNewBuild();
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  watchServedBuild({ autoReload: !isDev });
}
