import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while a module chunk is being fetched.
 *
 * A skeleton that mirrors the real module layout (header, stat row, table)
 * makes the transition feel instant, unlike a centred spinner which reads as
 * "nothing is happening".
 */
export function ModuleSkeleton() {
  return (
    <div className="p-6 space-y-6" role="status" aria-label="Loading module">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border">
        <div className="border-b border-border p-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Compact variant for lazy content rendered inside an existing module shell. */
export function PanelSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * Static shell painted immediately while a module chunk downloads, so the page
 * never goes blank between the click and the first frame of real content.
 */
export function ModuleShell({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="space-y-1">
      {title ? (
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      ) : (
        <Skeleton className="h-8 w-56" />
      )}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : (
        <Skeleton className="h-4 w-80" />
      )}
    </div>
  );
}

/** Rows placeholder for table-heavy panels. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border" role="status" aria-label="Loading table">
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Stat cards placeholder for dashboard-style panels. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading metrics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

