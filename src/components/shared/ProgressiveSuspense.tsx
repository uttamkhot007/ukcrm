import { ReactNode, Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders `children` only after `delay` ms.
 *
 * Chunks that resolve from cache paint in <100ms; showing a full skeleton for
 * those causes a jarring flash. Holding the skeleton back means fast switches
 * feel instant and only genuinely slow loads get a placeholder.
 */
export function Delayed({ delay = 120, children }: { delay?: number; children: ReactNode }) {
  const [show, setShow] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const t = window.setTimeout(() => setShow(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);

  return show ? <>{children}</> : null;
}

/** Slim indeterminate bar pinned to the top of the loading region. */
export function InlineLoadingBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-0.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      role="progressbar"
      aria-label="Loading content"
    >
      <div className="h-full w-1/3 animate-progress-slide rounded-full bg-primary" />
    </div>
  );
}

interface ProgressiveSuspenseProps {
  /** Stable key: remounting the boundary restarts the loading sequence. */
  boundaryKey?: string;
  /** Skeleton that mirrors the incoming layout. */
  skeleton: ReactNode;
  /** Rendered immediately (header/toolbar) so the page is never blank. */
  shell?: ReactNode;
  /** Delay before the skeleton appears, in ms. */
  delay?: number;
  children: ReactNode;
}

/**
 * Suspense boundary with progressive rendering:
 * 1. the static shell paints instantly,
 * 2. a thin progress bar signals work in flight,
 * 3. the skeleton only appears if loading exceeds `delay`.
 */
export function ProgressiveSuspense({
  boundaryKey,
  skeleton,
  shell,
  delay = 120,
  children,
}: ProgressiveSuspenseProps) {
  return (
    <Suspense
      key={boundaryKey}
      fallback={
        <div className="space-y-4" aria-busy="true">
          {shell}
          <InlineLoadingBar />
          <Delayed delay={delay}>{skeleton}</Delayed>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
