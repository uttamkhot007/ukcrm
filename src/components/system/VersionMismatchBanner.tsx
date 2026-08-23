import { useEffect, useState } from "react";
import { RefreshCw, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getReleaseVerificationState,
  NEW_BUILD_EVENT,
  isRunningBuildBelowFloor,
  requestReleaseReload,
  subscribeReleaseVerification,
  type ReleaseVerificationState,
  type ServedBuild,
} from "@/lib/build-cache-strategy";
import { BUILD_TIME } from "@/lib/build-info";

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
  const [reloading, setReloading] = useState(false);
  const [verification, setVerification] = useState<ReleaseVerificationState>(
    () => getReleaseVerificationState(),
  );

  const hardReload = () => {
    setReloading(true);
    const id = mismatch?.servedId ?? "manual-version-mismatch";
    if (!requestReleaseReload(id, { clearCaches: true, userInitiated: true })) setReloading(false);
  };

  // Presentation only. The release controller owns probing and reloading.
  useEffect(() => {
    const onNewBuild = (event: Event) => {
      const served = (event as CustomEvent<ServedBuild>).detail;
      if (served?.id) setMismatch({ servedId: served.id, reason: "newer" });
    };

    if (isRunningBuildBelowFloor()) {
      setMismatch({ servedId: "release-floor", reason: "stale-shell" });
    }

    window.addEventListener(NEW_BUILD_EVENT, onNewBuild);
    const unsubscribe = subscribeReleaseVerification(setVerification);

    return () => {
      window.removeEventListener(NEW_BUILD_EVENT, onNewBuild);
      unsubscribe();
    };
  }, []);

  const unverified = verification.status === "unverifiable";
  if (!mismatch && !unverified) return null;

  const title =
    unverified
      ? "App version could not be verified"
      : mismatch?.reason === "stale-shell"
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
          : unverified
            ? "Changes are disabled until the server confirms this release. Check your connection or reload safely."
            : `Latest release detected · running build ${BUILD_TIME}`}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 min-h-8 px-3 text-xs focus-visible:ring-2 focus-visible:ring-offset-2"
          onClick={hardReload}
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
