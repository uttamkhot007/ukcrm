// @vitest-environment jsdom
/**
 * KeepAlive LRU behaviour.
 *
 * The whole point of KeepAlive is a bounded cache: the N most recently used
 * panes stay mounted (so returning is instant and their state survives), and
 * everything older is unmounted so memory and timers do not grow without
 * bound. These tests pin both halves of that contract — retention *and*
 * eviction/cleanup — plus the hit/miss telemetry derived from it.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KeepAlive } from "@/components/shared/KeepAlive";
import { getCacheStats, resetCacheStats } from "@/lib/cache-metrics";

/** Records mount/unmount per pane so eviction cleanup is observable. */
const mounts: string[] = [];
const unmounts: string[] = [];

function Pane({ id }: { id: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    mounts.push(id);
    return () => {
      unmounts.push(id);
    };
  }, [id]);
  return (
    <div>
      <span data-testid={`pane-${id}`}>{`${id}:${count}`}</span>
      <button type="button" onClick={() => setCount((c) => c + 1)}>{`inc-${id}`}</button>
    </div>
  );
}

function Harness({ activeKey, max = 4 }: { activeKey: string; max?: number }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <KeepAlive activeKey={activeKey} max={max} moduleId="test-module">
        {(key) => <Pane id={key} />}
      </KeepAlive>
    </QueryClientProvider>
  );
}

const mountedPanes = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-pane]")).map(
    (el) => el.dataset.pane as string,
  );

const visiblePanes = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-pane]"))
    .filter((el) => !el.hasAttribute("hidden"))
    .map((el) => el.dataset.pane as string);

beforeAll(() => {
  // jsdom has no layout engine; KeepAlive restores scroll on activation.
  window.scrollTo = vi.fn();
});

beforeEach(() => {
  mounts.length = 0;
  unmounts.length = 0;
  resetCacheStats();
});

afterEach(cleanup);

describe("KeepAlive LRU", () => {
  it("mounts the active pane and keeps previous panes mounted but hidden", () => {
    const { rerender } = render(<Harness activeKey="a" />);
    expect(visiblePanes()).toEqual(["a"]);

    rerender(<Harness activeKey="b" />);
    expect(mountedPanes().sort()).toEqual(["a", "b"]);
    expect(visiblePanes()).toEqual(["b"]);
    // Hidden panes stay in the DOM (state preserved) and out of the a11y tree.
    expect(screen.getByTestId("pane-a").closest("[data-pane]")).toHaveAttribute("hidden");
    expect(unmounts).toEqual([]);
  });

  it("keeps at most 4 panes mounted and evicts the least recently used", () => {
    const { rerender } = render(<Harness activeKey="a" />);
    for (const key of ["b", "c", "d"]) rerender(<Harness activeKey={key} />);
    expect(mountedPanes().sort()).toEqual(["a", "b", "c", "d"]);
    expect(unmounts).toEqual([]);

    rerender(<Harness activeKey="e" />);
    expect(mountedPanes().sort()).toEqual(["b", "c", "d", "e"]);
    // The evicted pane is really unmounted — effects cleaned up, not just hidden.
    expect(unmounts).toEqual(["a"]);
    expect(screen.queryByTestId("pane-a")).toBeNull();
  });

  it("evicts by recency of use, not order of first visit", () => {
    const { rerender } = render(<Harness activeKey="a" />);
    for (const key of ["b", "c", "d"]) rerender(<Harness activeKey={key} />);

    // Touch "a" so it becomes the most recently used; "b" is now the oldest.
    rerender(<Harness activeKey="a" />);
    rerender(<Harness activeKey="e" />);

    expect(mountedPanes().sort()).toEqual(["a", "c", "d", "e"]);
    expect(unmounts).toEqual(["b"]);
  });

  it("preserves state for panes inside the window and resets it after eviction", async () => {
    const { rerender } = render(<Harness activeKey="a" />);
    await act(async () => {
      screen.getByText("inc-a").click();
      screen.getByText("inc-a").click();
    });
    expect(screen.getByTestId("pane-a")).toHaveTextContent("a:2");

    // Still inside the LRU window: the tree was never unmounted.
    for (const key of ["b", "c", "d", "a"]) rerender(<Harness activeKey={key} />);
    expect(screen.getByTestId("pane-a")).toHaveTextContent("a:2");
    expect(mounts.filter((m) => m === "a")).toHaveLength(1);

    // Push "a" out of the window, then return: it remounts from scratch.
    for (const key of ["b", "c", "d", "e", "f"]) rerender(<Harness activeKey={key} />);
    expect(unmounts).toContain("a");
    rerender(<Harness activeKey="a" />);
    expect(screen.getByTestId("pane-a")).toHaveTextContent("a:0");
    expect(mounts.filter((m) => m === "a")).toHaveLength(2);
  });

  it("honours a custom max", () => {
    const { rerender } = render(<Harness activeKey="a" max={2} />);
    rerender(<Harness activeKey="b" max={2} />);
    rerender(<Harness activeKey="c" max={2} />);
    expect(mountedPanes().sort()).toEqual(["b", "c"]);
    expect(unmounts).toEqual(["a"]);
  });

  it("reports a keep-alive hit for a retained revisit and a miss after eviction", () => {
    const { rerender } = render(<Harness activeKey="a" />);
    rerender(<Harness activeKey="b" />);
    rerender(<Harness activeKey="a" />); // retained revisit -> hit

    let stats = getCacheStats();
    expect(stats.pane.hits).toBe(1);
    expect(stats.pane.misses).toBe(0);
    expect(stats.pane.byModule[0].module).toBe("test-module");

    // Evict "b" (max 4: a,b + c,d,e pushes b out), then come back to it.
    for (const key of ["c", "d", "e", "f"]) rerender(<Harness activeKey={key} />);
    rerender(<Harness activeKey="b" />);

    stats = getCacheStats();
    expect(stats.pane.misses).toBeGreaterThan(0);
    expect(stats.pane.hitRatio).toBeLessThan(1);
  });
});
