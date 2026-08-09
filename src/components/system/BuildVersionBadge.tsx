import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tag, RefreshCw, Copy, X, ChevronUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BUILD_VERSION,
  BUILD_TIME,
  BUILD_COMMIT,
  formatBuildLabel,
  getFullBuildInfo,
} from "@/lib/build-info";
import { forceFreshReload, clearAllAppCaches, hardReloadLatestBuild } from "@/lib/cache-cleanup";
import {
  getRecentRedirects,
  clearRedirectHistory,
} from "@/lib/redirect-loop-guard";
import { toast } from "@/hooks/use-toast";
import {
  checkLiveBuild,
  formatBehind,
  LIVE_SITE_URL,
  type LiveBuildResult,
} from "@/lib/live-build-check";

/**
 * Floating bottom-left badge showing the current frontend build version.
 *
 * Click to expand a panel with:
 *   - Full build label
 *   - Current route
 *   - Recent redirect history (helps debug loops)
 *   - "Clear cache & reload" button (unregisters SW, deletes caches, hard-reloads)
 *   - "Copy build info" button
 */
export function BuildVersionBadge() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [badgeNonce, setBadgeNonce] = useState(0);
  const [liveBuild, setLiveBuild] = useState<LiveBuildResult | null>(null);
  const [checkingLive, setCheckingLive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const rerender = () => setBadgeNonce((n) => n + 1);
    window.addEventListener("nexus:build-info-updated", rerender);
    return () => window.removeEventListener("nexus:build-info-updated", rerender);
  }, []);

  // Pre-flight: compare the published site's build with this one.
  useEffect(() => {
    let cancelled = false;
    checkLiveBuild()
      .then((result) => {
        if (cancelled) return;
        setLiveBuild(result);
        if (result.status === "stale") {
          toast({
            title: "Live site is running an older build",
            description: `${LIVE_SITE_URL} is ${formatBehind(result.behindMs)} this preview. Publish → Update before relying on the live URL.`,
            variant: "destructive",
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const runLiveCheck = async () => {
    setCheckingLive(true);
    try {
      const result = await checkLiveBuild({ force: true });
      setLiveBuild(result);
      toast({
        title:
          result.status === "stale"
            ? "Live site is behind"
            : result.status === "fresh"
              ? "Live site is up to date"
              : "Live build could not be verified",
        description:
          result.status === "stale"
            ? `${formatBehind(result.behindMs)} — publish to update it.`
            : result.reason ?? `Live build: ${result.liveBuildTime}`,
        variant: result.status === "stale" ? "destructive" : "default",
      });
    } finally {
      setCheckingLive(false);
    }
  };



  const handleHardReload = async () => {
    setBusy(true);
    toast({
      title: "Clearing caches…",
      description: "Unregistering service workers and forcing a fresh reload.",
    });
    try {
      await forceFreshReload(location.pathname);
    } catch (e) {
      setBusy(false);
      toast({
        title: "Cleanup failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleCopyInfo = async () => {
    const info = {
      ...getFullBuildInfo(),
      route: location.pathname + location.search,
      redirects: getRecentRedirects(10),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
      toast({ title: "Copied", description: "Build info copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access blocked.",
        variant: "destructive",
      });
    }
  };

  const handleSoftClean = async () => {
    setBusy(true);
    try {
      await clearAllAppCaches();
      clearRedirectHistory();
      toast({
        title: "Caches cleared",
        description: "Refresh the page to load the latest assets.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleHardLatestBuild = async () => {
    setBusy(true);
    toast({
      title: "Hard reloading latest build…",
      description: "Bypassing service workers and cache-busting asset URLs.",
    });
    try {
      await hardReloadLatestBuild(location.pathname + location.search);
    } catch (e) {
      setBusy(false);
      toast({
        title: "Hard reload failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const recents = getRecentRedirects(5);

  const liveStale = liveBuild?.status === "stale";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          liveStale
            ? "Live site is serving an older build — click for details"
            : "Show build info"
        }
        className={`fixed bottom-3 left-3 z-[60] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono shadow-sm backdrop-blur transition-colors ${
          liveStale
            ? "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground"
        }`}
      >
        {liveStale ? <AlertTriangle className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
        {formatBuildLabel()}
        {liveStale ? " · live stale" : badgeNonce > 0 ? " · fresh" : ""}
      </button>
    );
  }


  return (
    <div className="fixed bottom-3 left-3 z-[60] w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl border bg-card/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold">Frontend Build</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close build panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3">
        <div className="rounded-lg bg-muted/40 p-2 text-[11px] font-mono space-y-1">
          <div>
            <span className="text-muted-foreground">version</span>{" "}
            <span className="text-foreground">v{BUILD_VERSION}</span>
          </div>
          <div>
            <span className="text-muted-foreground">built</span>{" "}
            <span className="text-foreground">{BUILD_TIME}</span>
          </div>
          <div>
            <span className="text-muted-foreground">commit</span>{" "}
            <span className="text-foreground">{BUILD_COMMIT}</span>
          </div>
          <div className="pt-1 border-t border-border/40">
            <span className="text-muted-foreground">route</span>{" "}
            <span className="text-primary">{location.pathname}</span>
          </div>
        </div>

        {/* Live-site pre-flight check */}
        <div
          className={`rounded-lg border p-2 text-[11px] space-y-1.5 ${
            liveStale
              ? "border-destructive/40 bg-destructive/5"
              : liveBuild?.status === "fresh"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border bg-muted/30"
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold">
            {liveStale ? (
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span>Live site pre-flight</span>
          </div>
          <p className="text-muted-foreground leading-snug">
            {liveStale
              ? `The published site is ${formatBehind(liveBuild?.behindMs ?? null)} this build. Publish → Update before relying on it.`
              : liveBuild?.status === "fresh"
                ? "Published site matches this build."
                : liveBuild?.status === "same-origin"
                  ? "You are viewing the published site."
                  : (liveBuild?.reason ?? "Checking published build…")}
          </p>
          {liveBuild?.liveBuildTime && (
            <div className="font-mono text-[10px] text-muted-foreground">
              live · {liveBuild.liveBuildTime}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full text-[11px]"
            onClick={runLiveCheck}
            disabled={checkingLive}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${checkingLive ? "animate-spin" : ""}`} />
            Re-check live build
          </Button>
        </div>



        {recents.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] font-mono">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-300 mb-1 font-sans font-semibold text-[11px]">
              <ChevronUp className="w-3 h-3" />
              Recent redirects
            </div>
            <ul className="space-y-0.5 text-muted-foreground">
              {recents.map((r, i) => (
                <li key={i} className="truncate" title={`${r.from} → ${r.to}`}>
                  {r.from} → <span className="text-foreground">{r.to}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px]"
            onClick={handleCopyInfo}
            disabled={busy}
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy info
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px]"
            onClick={handleSoftClean}
            disabled={busy}
          >
            <X className="w-3 h-3 mr-1" />
            Clear caches
          </Button>
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-[11px]"
          onClick={handleHardReload}
          disabled={busy}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} />
          Clear cache &amp; reload latest build
        </Button>

        <Button
          size="sm"
          variant="secondary"
          className="w-full h-8 text-[11px]"
          onClick={handleHardLatestBuild}
          disabled={busy}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} />
          Hard reload latest build
        </Button>
      </div>
    </div>
  );
}
