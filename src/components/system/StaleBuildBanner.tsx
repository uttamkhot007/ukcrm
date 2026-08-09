import { AlertTriangle, Lock, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaleBuildGuard } from "@/contexts/StaleBuildGuardContext";
import { LIVE_SITE_URL } from "@/lib/live-build-check";
import { formatBehindLocalized, t } from "@/lib/i18n/build-status-messages";
import { cn } from "@/lib/utils";

/**
 * Admin-only banner shown when the published site is behind this build.
 * While visible, risky admin actions are disabled across the admin shell.
 *
 * Accessibility: labelled assertive alert region, icons hidden from AT,
 * keyboard-focusable actions with explicit focus rings and 44px-friendly hit
 * areas. All copy is sourced from the localization catalog.
 */
export function StaleBuildBanner({ className }: { className?: string }) {
  const { isStale, checking, overridden, riskyActionsBlocked, live, recheck, override } =
    useStaleBuildGuard();

  if (!isStale) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-busy={checking}
      aria-label={t("region.staleBanner")}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive",
        className,
      )}
    >
      <span className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
        {t("banner.title", { behind: formatBehindLocalized(live?.behindMs ?? null) })}
      </span>

      <span className="flex items-center gap-1.5 text-xs font-normal text-destructive/90">
        {riskyActionsBlocked ? (
          <>
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {t("banner.blocked", { url: LIVE_SITE_URL })}
          </>
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {t("banner.overridden")}
          </>
        )}
      </span>

      {checking && <span className="sr-only">{t("status.checking")}</span>}

      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 min-h-8 border-destructive/40 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
          onClick={() => void recheck()}
          disabled={checking}
          aria-label={t("action.recheckLive")}
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5 mr-1", checking && "animate-spin")}
            aria-hidden="true"
          />
          <span aria-hidden="true">{t("action.recheckLive")}</span>
        </Button>
        {!overridden && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 min-h-8 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            onClick={override}
            aria-label={t("action.proceedAnyway")}
          >
            {t("action.proceedAnyway")}
          </Button>
        )}
      </div>
    </div>
  );
}

