import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { checkLiveBuild, formatBehind, type LiveBuildResult } from "@/lib/live-build-check";
import {
  getReleaseVerificationState,
  subscribeReleaseVerification,
  type ReleaseVerificationState,
} from "@/lib/build-cache-strategy";

/**
 * Stale-build guard (admin banner mode).
 *
 * When the published site is serving an older build than the one running in
 * this tab, any write performed here can be reasoned about with the wrong UI:
 * an admin may "fix" something that the live site never received. While that
 * mismatch exists we put the admin shell into banner mode and disable risky
 * actions (tenant create/edit, tier changes, role changes, deletes) until the
 * live build is re-checked — or explicitly overridden for the session.
 */

export interface StaleBuildGuardValue {
  /** Latest live-build comparison result (null until the first check lands). */
  live: LiveBuildResult | null;
  /** A check is currently in flight. */
  checking: boolean;
  /** Live site is behind this build. */
  isStale: boolean;
  /** Risky (write) actions must be blocked right now. */
  riskyActionsBlocked: boolean;
  /** Admin explicitly chose to proceed despite the mismatch. */
  overridden: boolean;
  /** Human-readable explanation for tooltips / toasts. */
  blockedReason: string | null;
  /** Force a fresh live-build check. Clears the override on success. */
  recheck: () => Promise<void>;
  /** Proceed anyway for the rest of this session. */
  override: () => void;
}

const StaleBuildGuardContext = createContext<StaleBuildGuardValue | null>(null);

const OVERRIDE_KEY = "nexus:stale-build-override";

export function StaleBuildGuardProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveBuildResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [releaseVerification, setReleaseVerification] = useState<ReleaseVerificationState>(
    () => getReleaseVerificationState(),
  );
  const [overridden, setOverridden] = useState(() => {
    try {
      return sessionStorage.getItem(OVERRIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const warned = useRef(false);

  const run = useCallback(async (force: boolean) => {
    setChecking(true);
    try {
      const result = await checkLiveBuild({ force });
      setLive(result);
      if (result.status !== "stale") {
        setOverridden(false);
        try {
          sessionStorage.removeItem(OVERRIDE_KEY);
        } catch {
          /* ignore */
        }
      }
      return result;
    } catch {
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void run(false);
  }, [run]);
  useEffect(() => subscribeReleaseVerification(setReleaseVerification), []);

  const isStale = live?.status === "stale";

  useEffect(() => {
    if (isStale && !warned.current) {
      warned.current = true;
      toast.warning("Live site is outdated", {
        description: `Risky admin actions are disabled until you re-check (${formatBehind(
          live?.behindMs ?? null,
        )}).`,
      });
    }
    if (!isStale) warned.current = false;
  }, [isStale, live?.behindMs]);

  const override = useCallback(() => {
    setOverridden(true);
    try {
      sessionStorage.setItem(OVERRIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<StaleBuildGuardValue>(() => {
    const releaseUnverifiable = releaseVerification.status === "unverifiable";
    const riskyActionsBlocked = releaseUnverifiable || (isStale && !overridden);
    return {
      live,
      checking,
      isStale,
      overridden,
      riskyActionsBlocked,
      blockedReason: riskyActionsBlocked
        ? releaseUnverifiable
          ? "This app release could not be verified. Reload or reconnect before making changes."
          : `The live site is ${formatBehind(live?.behindMs ?? null)}. Re-check the live build (or override) before making changes.`
        : null,
      recheck: async () => {
        await run(true);
      },
      override,
    };
  }, [live, checking, isStale, overridden, run, override, releaseVerification.status]);

  return (
    <StaleBuildGuardContext.Provider value={value}>{children}</StaleBuildGuardContext.Provider>
  );
}

/**
 * Read the guard. Safe outside the admin shell: non-admin surfaces simply get
 * an "everything allowed" value so shared components stay usable.
 */
export function useStaleBuildGuard(): StaleBuildGuardValue {
  const ctx = useContext(StaleBuildGuardContext);
  return (
    ctx ?? {
      live: null,
      checking: false,
      isStale: false,
      overridden: false,
      riskyActionsBlocked: false,
      blockedReason: null,
      recheck: async () => {},
      override: () => {},
    }
  );
}

/**
 * Helper for buttons and handlers guarding a write.
 *
 * ```tsx
 * const risky = useRiskyAction();
 * <Button disabled={risky.disabled} title={risky.reason ?? undefined}
 *   onClick={() => risky.run(() => save())} />
 * ```
 */
export function useRiskyAction() {
  const { riskyActionsBlocked, blockedReason } = useStaleBuildGuard();
  const run = useCallback(
    <T,>(action: () => T): T | undefined => {
      if (riskyActionsBlocked) {
        toast.error("Action blocked — live site is outdated", {
          description: blockedReason ?? undefined,
        });
        return undefined;
      }
      return action();
    },
    [riskyActionsBlocked, blockedReason],
  );

  return { disabled: riskyActionsBlocked, reason: blockedReason, run };
}
