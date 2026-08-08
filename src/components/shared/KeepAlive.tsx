import { ReactNode, useEffect, useRef, useState } from "react";
import {
  DEFAULT_MODULE_TTL_MS,
  useStaleRevalidation,
} from "@/hooks/useStaleRevalidation";
import { recordPaneActivation, recordPaneEviction } from "@/lib/cache-metrics";

/**
 * Keeps recently visited panes mounted so switching back is instant.
 *
 * Unmounting a sub-module on every tab switch throws away its React state
 * (filters, pagination, scroll, half-filled forms) and forces its queries to
 * mount fresh. KeepAlive instead hides inactive panes with `hidden`
 * (display:none), which preserves the component tree and the DOM while keeping
 * hidden content out of the accessibility tree.
 *
 * Memory is bounded by an LRU: only the `max` most recently used panes stay
 * mounted, everything older is unmounted and will re-mount from the persisted
 * query cache (which is fast) if the user returns.
 */
interface KeepAliveProps {
  /** Pane currently visible. */
  activeKey: string;
  /** How many panes to keep mounted, including the active one. */
  max?: number;
  /**
   * How stale a kept-alive pane's data may get before it is revalidated
   * automatically on re-entry (and periodically while visible).
   */
  ttlMs?: number;
  /** Module id used to attribute keep-alive hit/miss telemetry. */
  moduleId?: string;
  /** Renders the content for a pane key. Called once per mounted pane. */
  children: (key: string) => ReactNode;
}

export function KeepAlive({
  activeKey,
  max = 4,
  ttlMs = DEFAULT_MODULE_TTL_MS,
  moduleId = "module",
  children,
}: KeepAliveProps) {
  const [keys, setKeys] = useState<string[]>([activeKey]);

  useEffect(() => {
    setKeys((prev) => {
      if (prev[0] === activeKey) return prev;
      // A revisit is a cache hit only when the pane survived the LRU.
      recordPaneActivation(moduleId, activeKey, prev.includes(activeKey));
      const next = [activeKey, ...prev.filter((k) => k !== activeKey)].slice(0, max);
      for (const evicted of prev) {
        if (!next.includes(evicted)) recordPaneEviction(moduleId, evicted);
      }
      return next;
    });
  }, [activeKey, max, moduleId]);

  // Render the active pane on the very first frame, before the effect above
  // has had a chance to register it.
  const mounted = keys.includes(activeKey)
    ? keys
    : [activeKey, ...keys].slice(0, max);

  return (
    <>
      {mounted.map((key) => (
        <KeepAlivePane
          key={key}
          paneKey={key}
          active={key === activeKey}
          ttlMs={ttlMs}
        >
          {children(key)}
        </KeepAlivePane>
      ))}
    </>
  );
}

function KeepAlivePane({
  paneKey,
  active,
  ttlMs,
  children,
}: {
  paneKey: string;
  active: boolean;
  ttlMs: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);

  // Mounted-but-hidden panes never re-run React Query's mount refetch, so a
  // TTL drives revalidation when the user returns to them.
  useStaleRevalidation({ active, ttlMs });

  // Restore the window scroll position the pane was left at, so returning to a
  // long table does not dump the user back at the top.
  useEffect(() => {
    if (active) {
      window.scrollTo({ top: scrollTop.current });
      return;
    }
    scrollTop.current = window.scrollY;
  }, [active]);

  return (
    <div ref={ref} hidden={!active} data-pane={paneKey} className="min-w-0">
      {children}
    </div>
  );
}
