import { Loader2 } from "lucide-react";

/**
 * Shown while a module is refetching in the background with data already on
 * screen. A thin indeterminate bar plus an inline badge tells users the view
 * is being updated without blanking out the content they are reading.
 */
export function RevalidationBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/15"
      role="progressbar"
      aria-label="Refreshing data"
      aria-busy="true"
    >
      <div className="h-full w-1/3 animate-indeterminate rounded-full bg-primary" />
    </div>
  );
}

export function RevalidationBadge({
  active,
  label = "Updating…",
  className = "",
}: {
  active: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground transition-opacity duration-200 ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      } ${className}`}
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      {active ? label : ""}
    </span>
  );
}

/**
 * Combined helper: dims stale content slightly while a refetch is in flight so
 * the update is perceivable even away from the header.
 */
export function RevalidatingContent({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-busy={active}
      className={`transition-opacity duration-200 ${active ? "opacity-70" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}
