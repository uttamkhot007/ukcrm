import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILD_TIME, BUILD_VERSION, BUILD_COMMIT } from "@/lib/build-info";
import { checkLiveBuild, LIVE_SITE_URL, type LiveBuildResult } from "@/lib/live-build-check";
import { formatBehindLocalized, formatBuildTime, t } from "@/lib/i18n/build-status-messages";
import { cn } from "@/lib/utils";

/**
 * Inline build/version strip shown on every admin page.
 *
 * Displays the build running in this tab and, when the published site is
 * behind, an explicit "live site is outdated" warning so admins never rely on
 * stale deployed changes.
 *
 * Accessibility: the strip is a labelled `status` region that announces
 * politely, marks itself busy while a check runs, and exposes a fully
 * keyboard-reachable re-check button with a descriptive accessible name.
 * All copy comes from the localization catalog.
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
  const behind = formatBehindLocalized(live?.behindMs ?? null);

  const Icon = stale
    ? AlertTriangle
    : status === "fresh" || status === "same-origin"
      ? CheckCircle2
      : HelpCircle;

  const headline = stale
    ? t("status.stale", { behind })
    : status === "fresh"
      ? t("status.fresh")
      : status === "same-origin"
        ? t("status.sameOrigin")
        : t("status.unknown");

  const versionLabel = t("label.buildVersion", {
    version: BUILD_VERSION,
    time: formatBuildTime(BUILD_TIME),
    commit: BUILD_COMMIT,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={checking}
      aria-label={t("region.buildStatus")}
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
        {headline}
      </span>

      {checking && <span className="sr-only">{t("status.checking")}</span>}

      {/* Visible text stays compact; the accessible name spells it out. */}
      <span
        className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
        aria-label={versionLabel}
      >
        <Tag className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span aria-hidden="true">
          v{BUILD_VERSION} · {formatBuildTime(BUILD_TIME)} · {BUILD_COMMIT}
        </span>
      </span>

      {live?.liveBuildTime && (
        <span className="font-mono text-[11px] text-muted-foreground">
          {t("label.liveBuild", { time: formatBuildTime(live.liveBuildTime) })}
        </span>
      )}

      {stale && (
        <span className="text-[11px] font-normal text-muted-foreground">
          {t("label.publishHint", { url: LIVE_SITE_URL })}
        </span>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-6 min-h-6 px-2 text-[11px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => void run(true)}
        disabled={checking}
        aria-label={t("action.recheckLive")}
      >
        <RefreshCw className={cn("w-3 h-3 mr-1", checking && "animate-spin")} aria-hidden="true" />
        <span aria-hidden="true">{t("action.recheck")}</span>
      </Button>
    </div>
  );
}
