import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILD_TIME, BUILD_VERSION, BUILD_COMMIT } from "@/lib/build-info";
import {
  checkLiveBuild,
  formatBehind,
  LIVE_SITE_URL,
  type LiveBuildResult,
} from "@/lib/live-build-check";
import { cn } from "@/lib/utils";

function shortTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Inline build/version strip shown on every admin page.
 *
 * Displays the build running in this tab and, when the published site is
 * behind, an explicit "live site is outdated" warning so admins never rely on
 * stale deployed changes.
 */
export function BuildStatusIndicator({ className }: { className?: string }) {
  const [live, setLive] = useState<LiveBuildResult | null>(null);
  const [checking, setChecking] = useState(false);

  const run = useCallback(async (force = false) => {
    setChecking(true);
    try {
      setLive(await checkLiveBuild({ force }));
    } catch {
      /* handled by checkLiveBuild's own fallbacks */
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void run(false);
  }, [run]);

  const status = live?.status ?? "unknown";
  const stale = status === "stale";

  const Icon = stale
    ? AlertTriangle
    : status === "fresh" || status === "same-origin"
      ? CheckCircle2
      : HelpCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2 text-xs",
        stale
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : status === "fresh" || status === "same-origin"
            ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
            : "border-border bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {stale
          ? `Live site is outdated (${formatBehind(live?.behindMs ?? null)})`
          : status === "fresh"
            ? "Live site matches this build"
            : status === "same-origin"
              ? "You are on the live site"
              : "Live build not verified"}
      </span>

      <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <Tag className="w-3 h-3 shrink-0" aria-hidden="true" />
        v{BUILD_VERSION} · {shortTime(BUILD_TIME)} · {BUILD_COMMIT}
      </span>

      {live?.liveBuildTime && (
        <span className="font-mono text-[11px] text-muted-foreground">
          live: {shortTime(live.liveBuildTime)}
        </span>
      )}

      {stale && (
        <span className="text-[11px] font-normal text-muted-foreground">
          Publish → Update before trusting {LIVE_SITE_URL}
        </span>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-6 px-2 text-[11px]"
        onClick={() => void run(true)}
        disabled={checking}
      >
        <RefreshCw className={cn("w-3 h-3 mr-1", checking && "animate-spin")} aria-hidden="true" />
        Re-check
      </Button>
    </div>
  );
}
