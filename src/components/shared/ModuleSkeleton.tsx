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
