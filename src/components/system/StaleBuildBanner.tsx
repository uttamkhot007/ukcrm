import { AlertTriangle, Lock, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaleBuildGuard } from "@/contexts/StaleBuildGuardContext";
import { formatBehind, LIVE_SITE_URL } from "@/lib/live-build-check";
import { cn } from "@/lib/utils";

/**
 * Admin-only banner shown when the published site is behind this build.
 * While visible, risky admin actions are disabled across the admin shell.
 */
export function StaleBuildBanner({ className }: { className?: string }) {
  const { isStale, checking, overridden, riskyActionsBlocked, live, recheck, override } =
    useStaleBuildGuard();

  if (!isStale) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive",
        className,
      )}
    >
      <span className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
        Live site is outdated ({formatBehind(live?.behindMs ?? null)})
      </span>

      <span className="flex items-center gap-1.5 text-xs font-normal text-destructive/90">
        {riskyActionsBlocked ? (
          <>
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Tenant edits and other risky actions are disabled. Publish → Update, then re-check{" "}
            {LIVE_SITE_URL}.
          </>
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Override active — risky actions are enabled for this session despite the mismatch.
          </>
        )}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-destructive/40 px-2 text-xs"
          onClick={() => void recheck()}
          disabled={checking}
        >
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1", checking && "animate-spin")} aria-hidden="true" />
          Re-check live build
        </Button>
        {!overridden && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={override}>
            Proceed anyway
          </Button>
        )}
      </div>
    </div>
  );
}
