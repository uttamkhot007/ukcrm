/* ------------------------------------------------------------------ *
 * Cache epoch — hard, one-time global purge
 *
 * Bumping CACHE_EPOCH forces every browser that boots this bundle to:
 *   1. unregister every service worker registration on the origin,
 *   2. delete every Cache Storage bucket,
 *   3. clear app-owned localStorage / sessionStorage (auth + theme survive),
 *   4. reload once with a cache-bypassing query parameter so any CDN,
 *      proxy or bfcache copy of the shell is re-fetched from origin.
 *
 * This runs before React mounts, so a legacy shell can never paint.
 * Never lower CACHE_EPOCH.
 * ------------------------------------------------------------------ */

export const CACHE_EPOCH = 3;

const EPOCH_KEY = "nexus:cache-epoch";
const EPOCH_PARAM = "__epoch";

/** Keys that must survive a purge (session + user theme choice). */
function isPreservedKey(key: string): boolean {
  return (
    key === "nexus-theme" ||
    key.startsWith("sb-") ||
    key.startsWith("supabase.") ||
    key.startsWith("nexus:auth")
  );
}

function safeLocal(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getStoredCacheEpoch(): number {
  const raw = safeLocal()?.getItem(EPOCH_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function needsEpochPurge(): boolean {
  return getStoredCacheEpoch() < CACHE_EPOCH;
}

export async function purgeAllBrowserCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Service workers — any legacy worker can serve an ancient shell.
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {
    /* ignore */
  }

  // 2. Cache Storage.
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n).catch(() => false)));
    }
  } catch {
    /* ignore */
  }

  // 3. App storage (auth + theme preserved).
  try {
    const store = safeLocal();
    if (store) {
      const doomed: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && !isPreservedKey(key)) doomed.push(key);
      }
      doomed.forEach((k) => store.removeItem(k));
    }
  } catch {
    /* ignore */
  }

  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

function reloadBypassingCaches(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(EPOCH_PARAM, String(CACHE_EPOCH));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Enforce the current cache epoch. Returns true when a purge + reload was
 * triggered, meaning the caller must NOT mount the app.
 */
export function enforceCacheEpoch(): boolean {
  if (typeof window === "undefined") return false;
  if (!needsEpochPurge()) {
    // Tidy the bypass param out of the address bar once we are current.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has(EPOCH_PARAM)) {
        url.searchParams.delete(EPOCH_PARAM);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  void (async () => {
    await purgeAllBrowserCaches();
    try {
      safeLocal()?.setItem(EPOCH_KEY, String(CACHE_EPOCH));
    } catch {
      /* ignore */
    }
    reloadBypassingCaches();
  })();

  return true;
}
