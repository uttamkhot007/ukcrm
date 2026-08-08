import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * A lazily-loaded component that can also be *preloaded* imperatively.
 *
 * Code splitting alone makes the first paint fast but moves the cost to the
 * moment the user clicks. Preloading on intent (hover / focus / idle) removes
 * that cost too: by the time the click lands, the chunk is usually cached.
 */
export type PreloadableComponent<P = Record<string, unknown>> =
  LazyExoticComponent<ComponentType<P>> & { preload: () => Promise<unknown> };

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
      promise = loader().then((mod) => {
        const component = mod[exportName] ?? (mod as { default?: unknown }).default;
        if (!component) {
          throw new Error(`Module has no export named "${exportName}"`);
        }
        return { default: component as ComponentType<P> };
      });
      // Allow a later retry if the network dropped mid-chunk.
      promise.catch(() => {
        promise = null;
      });
    }
    return promise;
  };

  const Component = lazy(load) as PreloadableComponent<P>;
  Component.preload = load;
  return Component;
}

/** Wrap a dynamic import of a default export. */
export function lazyDefault<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): PreloadableComponent<P> {
  let promise: Promise<{ default: ComponentType<P> }> | null = null;
  const load = () => {
    if (!promise) {
      promise = loader();
      promise.catch(() => {
        promise = null;
      });
    }
    return promise;
  };
  const Component = lazy(load) as PreloadableComponent<P>;
  Component.preload = load;
  return Component;
}

/**
 * Warm a set of chunks when the browser is idle, so common next-steps are
 * already in memory without competing with the current render.
 */
export function preloadWhenIdle(components: Array<{ preload: () => Promise<unknown> }>) {
  const run = () => {
    for (const component of components) {
      void component.preload().catch(() => undefined);
    }
  };
  if (typeof window === "undefined") return;
  const idle = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (idle) idle(run, { timeout: 3000 });
  else window.setTimeout(run, 1200);
}
