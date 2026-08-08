import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { retryImport, shouldSkipSpeculativePreload } from "@/lib/chunk-retry";

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
    /** Speculative warm-up: skipped on slow/metered links, never throws. */
    warm: () => Promise<unknown>;
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
      promise = retryImport(loader, { label: `the ${exportName.replace(/Module$/, "")} section` }).then(
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
  Component.preload = load;
  Component.warm = () =>
    shouldSkipSpeculativePreload() ? Promise.resolve() : load().catch(() => undefined);
  return Component;
}

/** Wrap a dynamic import of a default export. */
export function lazyDefault<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): PreloadableComponent<P> {
  let promise: Promise<{ default: ComponentType<P> }> | null = null;
  const load = () => {
    if (!promise) {
      promise = retryImport(loader);
      promise.catch(() => {
        promise = null;
      });
    }
    return promise;
  };
  const Component = lazy(load) as PreloadableComponent<P>;
  Component.preload = load;
  Component.warm = () =>
    shouldSkipSpeculativePreload() ? Promise.resolve() : load().catch(() => undefined);
  return Component;
}

/**
 * Warm a set of chunks when the browser is idle, so common next-steps are
 * already in memory without competing with the current render. Skipped while
 * offline or on a metered/slow connection — speculative traffic is the first
 * thing that should be sacrificed there.
 */
export function preloadWhenIdle(components: Array<{ warm: () => Promise<unknown> }>) {
  if (typeof window === "undefined") return;

  const run = () => {
    if (shouldSkipSpeculativePreload()) return;
    for (const component of components) {
      void component.warm();
    }
  };

  const schedule = () => {
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (idle) idle(run, { timeout: 3000 });
    else window.setTimeout(run, 1200);
  };

  if (shouldSkipSpeculativePreload()) {
    // Try again once connectivity comes back rather than dropping the warm-up.
    window.addEventListener("online", schedule, { once: true });
    return;
  }
  schedule();
}
