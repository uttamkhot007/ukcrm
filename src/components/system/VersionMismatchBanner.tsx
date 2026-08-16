import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NEW_BUILD_EVENT,
  compareServedBuild,
  fetchServedBuild,
  isRunningBuildBelowFloor,
  recordReleaseObservation,
  type ServedBuild,
} from "@/lib/build-cache-strategy";
import { BUILD_TIME } from "@/lib/build-info";

const CHECK_GAP_MS = 60 * 1000;
const AUTO_RELOAD_SECONDS = 10;

type Mismatch = { servedId: string; reason: "newer" | "stale-shell" };

/**
 * Global, always-mounted version-mismatch banner.
 *
 * Shown the moment this tab is proven to be running anything other than the
 * newest release: either the origin serves a newer build, or the bundle
 * executing here predates a release this browser already ran (an old view
 * restored from HTTP cache / bfcache / a lagging server task).
 *
 * The only way out is a hard reload with cache bypass — all app caches and
 * service workers are dropped first, then the page is re-fetched with a
 * cache-busting URL. A short countdown performs it automatically so an
 * unattended tab can never keep showing the old view.
 */
export function VersionMismatchBanner() {
  const [mismatch, setMismatch] = useState<Mismatch | null>(null);
  const [seconds, setSeconds] = useState(AUTO_RELOAD_SECONDS);
  const [reloading, setReloading] = useState(false);
  const lastCheck = useRef(0);

  const hardReload = useCallback(async () => {
    setReloading(true);
    try {
      const { forceFreshReload } = await import("@/lib/cache-cleanup");
      await forceFreshReload();
    } catch {
      window.location.reload();
    }
  }, []);

  // Detection: event from the release watcher + an independent probe on
  // mount, focus and tab return.
  useEffect(() => {
    let cancelled = false;

    const evaluate = (served: ServedBuild) => {
      if (cancelled || !served.id) return;
      recordReleaseObservation(served.buildTime, served.id);
      const relation = compareServedBuild(served);
      if (relation === "newer") {
        setMismatch({ servedId: served.id, reason: "newer" });
      } else if (isRunningBuildBelowFloor()) {
        setMismatch({ servedId: served.id, reason: "stale-shell" });
      }
    };

    const probe = (force = false) => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (!force && now - lastCheck.current < CHECK_GAP_MS) return;
      lastCheck.current = now;
      void fetchServedBuild().then(evaluate).catch(() => undefined);
    };

    const onNewBuild = (event: Event) => {
      const served = (event as CustomEvent<ServedBuild>).detail;
      if (served) evaluate(served);
    };

    if (isRunningBuildBelowFloor()) {
      setMismatch({ servedId: "release-floor", reason: "stale-shell" });
    }

    probe(true);
    window.addEventListener(NEW_BUILD_EVENT, onNewBuild);
    window.addEventListener("focus", () => probe(true));
    document.addEventListener("visibilitychange", () => probe(true));
    const timer = window.setInterval(() => probe(), CHECK_GAP_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(NEW_BUILD_EVENT, onNewBuild);
    };
  }, []);

  // Countdown to the automatic hard reload.
  useEffect(() => {
    if (!mismatch || reloading) return;
    setSeconds(AUTO_RELOAD_SECONDS);
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void hardReload();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mismatch, reloading, hardReload]);

  if (!mismatch) return null;

  const title =
    mismatch.reason === "stale-shell"
      ? "You are viewing an outdated version of the app"
      : "A newer version of the app is available";

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed inset-x-0 top-0 z-[100] flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-destructive/50 bg-destructive px-4 py-2.5 text-sm text-destructive-foreground shadow-lg"
    >
      <span className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        {title}
      </span>
      <span className="text-xs opacity-90">
        {reloading
          ? "Clearing caches and loading the latest build…"
          : `Reloading with cache bypass in ${seconds}s · running build ${BUILD_TIME}`}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 min-h-8 px-3 text-xs focus-visible:ring-2 focus-visible:ring-offset-2"
          onClick={() => void hardReload()}
          disabled={reloading}
          aria-label="Reload now with cache bypass"
        >
          {reloading ? (
            <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          )}
          Reload now
        </Button>
      </div>
    </div>
  );
}
