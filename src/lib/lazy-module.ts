import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { retryImport } from "@/lib/chunk-retry";
import { measureChunkLoad } from "@/lib/perf-metrics";
import {
  cancelPreload,
  markPreloaded,
  schedulePreload,
  schedulePreloadWhenIdle,
  type PreloadTrigger,
} from "@/lib/preload-scheduler";

/**
 * A lazily-loaded component that can also be *preloaded* imperatively.
 *
 * Code splitting alone makes the first paint fast but moves the cost to the
 * moment the user clicks. Preloading on intent (hover / focus / idle) removes
 * that cost too: by the time the click lands, the chunk is usually cached.
 *
 * Every network fetch here goes through `retryImport`, which retries with
 * backoff, waits out offline periods and recovers from stale deploys, so a
 * flaky connection degrades into a short delay instead of a blank panel.
 */
export type PreloadableComponent<P = Record<string, unknown>> =
  LazyExoticComponent<ComponentType<P>> & {
    /** Load the chunk for real — retried, and errors propagate to the caller. */
    preload: () => Promise<unknown>;
    /**
     * Speculative warm-up through the preload scheduler: honours the trigger's
     * dwell delay and the concurrency cap, skipped on slow/metered links, and
     * never throws.
     */
    warm: (trigger?: PreloadTrigger) => void;
    /** Withdraw a warm-up that hasn't started yet (pointer left, blur). */
    cancelWarm: () => void;
    /** Chunk name this component reports under in the performance benchmarks. */
    chunkName: string;
  };

/**
 * Wrap a dynamic import of a *named* export as a preloadable lazy component.
 *
 *   const Sales = lazyNamed(() => import("@/components/sales/SalesModule"), "SalesModule");
 *   <Sales />            // rendered inside a <Suspense>
 *   Sales.preload()      // warm the chunk on hover
 */
export function lazyNamed<P = Record<string, unknown>>(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
): PreloadableComponent<P> {
  let promise: Promise<{ default: ComponentType<P> }> | null = null;

  const load = () => {
    if (!promise) {
      promise = measureChunkLoad(exportName, "lazy", (onAttempt) =>
        retryImport(loader, {
          label: `the ${exportName.replace(/Module$/, "")} section`,
          onAttempt,
        }),
      ).then(
        (mod) => {
          const component = mod[exportName] ?? (mod as { default?: unknown }).default;
          if (!component) {
            throw new Error(`Module has no export named "${exportName}"`);
          }
          return { default: component as ComponentType<P> };
        },
      );
      // Allow a later retry if every attempt failed.
      promise.catch(() => {
        promise = null;
      });
    }
    return promise;
  };

  const Component = lazy(load) as PreloadableComponent<P>;
  Component.preload = () => load().then((mod) => (markPreloaded(exportName), mod));
  Component.warm = (trigger) => schedulePreload(exportName, load, trigger);
  Component.cancelWarm = () => cancelPreload(exportName);
  Component.chunkName = exportName;
  return Component;
}

/** Wrap a dynamic import of a default export. */
export function lazyDefault<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  /** Name used to group this chunk in the performance benchmarks. */
  name = "route",
): PreloadableComponent<P> {
  let promise: Promise<{ default: ComponentType<P> }> | null = null;
  const load = () => {
    if (!promise) {
      promise = measureChunkLoad(name, "lazy", (onAttempt) =>
        retryImport(loader, { onAttempt }),
      );
      promise.catch(() => {
        promise = null;
      });
    }
    return promise;
  };
  const Component = lazy(load) as PreloadableComponent<P>;
  Component.preload = () => load().then((mod) => (markPreloaded(name), mod));
  Component.warm = (trigger) => schedulePreload(name, load, trigger);
  Component.cancelWarm = () => cancelPreload(name);
  Component.chunkName = name;
  return Component;
}

/**
 * Warm a set of chunks once the browser is idle, so common next-steps are
 * already in memory without competing with the current render.
 *
 * Queued at the lowest priority: any hover, focus or click preempts it, and
 * the scheduler's concurrency cap keeps the batch from saturating the link.
 * Returns a cancel function — call it on unmount so warm-ups for a screen the
 * user has already left are dropped instead of finishing pointlessly.
 */
export function preloadWhenIdle(
  components: Array<{ warm: (trigger?: PreloadTrigger) => void; chunkName: string; preload: () => Promise<unknown> }>,
): () => void {
  return schedulePreloadWhenIdle(
    components.map((component) => ({ key: component.chunkName, loader: component.preload })),
  );
}
