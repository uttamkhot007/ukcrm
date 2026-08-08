/**
 * The scheduler exists to stop speculative preloading from hurting the user:
 * a pointer sweeping the sidebar must not download a dozen chunks, and warm-
 * ups must never occupy more sockets than the connection can spare. Both are
 * invisible in manual testing, so they are pinned here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetPreloadScheduler,
  cancelPreload,
  isPreloaded,
  markPreloaded,
  preloadConcurrency,
  preloadSchedulerState,
  schedulePreload,
} from "@/lib/preload-scheduler";

/** A loader we can resolve by hand, so concurrency is observable. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = () => res();
    reject = rej;
  });
  const loader = vi.fn(() => promise);
  return { loader, resolve, reject, promise };
}

function setConnection(value: Record<string, unknown> | undefined) {
  Object.defineProperty(globalThis.navigator, "connection", {
    value,
    configurable: true,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetPreloadScheduler();
  vi.stubGlobal("navigator", { onLine: true } as Navigator);
});

afterEach(() => {
  __resetPreloadScheduler();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("preload triggers", () => {
  it("does not download while the pointer is only sweeping past", () => {
    const { loader } = deferred();
    schedulePreload("sales", loader, "hover");

    // Pointer moved on well before the hover dwell elapsed.
    vi.advanceTimersByTime(40);
    cancelPreload("sales");
    vi.advanceTimersByTime(500);

    expect(loader).not.toHaveBeenCalled();
    expect(preloadSchedulerState().pending).toBe(0);
  });

  it("downloads once hover intent persists past the dwell delay", () => {
    const { loader } = deferred();
    schedulePreload("sales", loader, "hover");

    vi.advanceTimersByTime(89);
    expect(loader).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("starts immediately on pointer-down, since the click is committed", () => {
    const { loader } = deferred();
    schedulePreload("sales", loader, "pointer");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("lets a pointer-down preempt an in-progress hover dwell", () => {
    const { loader } = deferred();
    schedulePreload("hr", loader, "hover");
    vi.advanceTimersByTime(30);
    expect(loader).not.toHaveBeenCalled();

    schedulePreload("hr", loader, "pointer");
    expect(loader).toHaveBeenCalledTimes(1);

    // The superseded hover timer must not fire a second download.
    vi.advanceTimersByTime(500);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("holds keyboard focus longer so arrow-keying a tab bar is not a storm", () => {
    const a = deferred();
    const b = deferred();
    schedulePreload("tab-a", a.loader, "focus");
    // User arrows straight past tab A.
    vi.advanceTimersByTime(50);
    cancelPreload("tab-a");
    schedulePreload("tab-b", b.loader, "focus");
    vi.advanceTimersByTime(120);

    expect(a.loader).not.toHaveBeenCalled();
    expect(b.loader).toHaveBeenCalledTimes(1);
  });

  it("ignores repeat requests for a key already loading or loaded", () => {
    const { loader } = deferred();
    schedulePreload("sales", loader, "pointer");
    schedulePreload("sales", loader, "pointer");
    schedulePreload("sales", loader, "hover");
    vi.advanceTimersByTime(500);

    expect(loader).toHaveBeenCalledTimes(1);

    markPreloaded("sales");
    schedulePreload("sales", loader, "pointer");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(isPreloaded("sales")).toBe(true);
  });
});

describe("concurrency limiting", () => {
  it("never runs more than three speculative downloads at once", () => {
    const jobs = Array.from({ length: 6 }, () => deferred());
    jobs.forEach((j, i) => schedulePreload(`m${i}`, j.loader, "pointer"));

    const started = () => jobs.filter((j) => j.loader.mock.calls.length > 0).length;
    expect(started()).toBe(3);
    expect(preloadSchedulerState().inflight).toBe(3);
  });

  it("starts the next queued download as each one settles", async () => {
    const jobs = Array.from({ length: 4 }, () => deferred());
    jobs.forEach((j, i) => schedulePreload(`m${i}`, j.loader, "pointer"));
    expect(jobs[3]!.loader).not.toHaveBeenCalled();

    jobs[0]!.resolve();
    await vi.runAllTicks();
    await Promise.resolve();
    await Promise.resolve();

    expect(jobs[3]!.loader).toHaveBeenCalledTimes(1);
  });

  it("keeps draining after a failed preload", async () => {
    const jobs = Array.from({ length: 4 }, () => deferred());
    jobs.forEach((j, i) => schedulePreload(`m${i}`, j.loader, "pointer"));

    jobs[0]!.reject(new Error("network"));
    await vi.runAllTicks();
    await Promise.resolve();
    await Promise.resolve();

    expect(jobs[3]!.loader).toHaveBeenCalledTimes(1);
    // A failed speculative load must not be remembered as warm.
    expect(isPreloaded("m0")).toBe(false);
  });

  it("runs higher-intent work before background idle warming", () => {
    const blockers = Array.from({ length: 3 }, () => deferred());
    blockers.forEach((b, i) => schedulePreload(`block${i}`, b.loader, "pointer"));

    const idle = deferred();
    const hover = deferred();
    schedulePreload("idle-job", idle.loader, "idle");
    schedulePreload("hover-job", hover.loader, "pointer");

    blockers[0]!.resolve();
    return Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => {
        expect(hover.loader).toHaveBeenCalledTimes(1);
        expect(idle.loader).not.toHaveBeenCalled();
      });
  });

  it("drops the least-wanted backlog instead of queueing without bound", () => {
    for (let i = 0; i < 40; i += 1) {
      schedulePreload(`m${i}`, deferred().loader, "pointer");
    }
    const state = preloadSchedulerState();
    expect(state.inflight).toBe(3);
    expect(state.queued).toBeLessThanOrEqual(8);
  });
});

describe("connection awareness", () => {
  it("allows a full three parallel warm-ups on fast links", () => {
    setConnection({ effectiveType: "4g" });
    expect(preloadConcurrency()).toBe(3);
  });

  it("warms only one chunk at a time on 3g", () => {
    setConnection({ effectiveType: "3g" });
    const jobs = Array.from({ length: 3 }, () => deferred());
    jobs.forEach((j, i) => schedulePreload(`m${i}`, j.loader, "pointer"));

    expect(jobs.filter((j) => j.loader.mock.calls.length > 0)).toHaveLength(1);
  });

  it("preloads nothing on 2g or with data saver on", () => {
    for (const conn of [{ effectiveType: "2g" }, { effectiveType: "4g", saveData: true }]) {
      __resetPreloadScheduler();
      setConnection(conn);
      const { loader } = deferred();
      schedulePreload("sales", loader, "pointer");
      vi.advanceTimersByTime(1000);
      expect(loader).not.toHaveBeenCalled();
    }
  });

  it("skips speculative work entirely while offline", () => {
    setConnection(undefined);
    vi.stubGlobal("navigator", { onLine: false } as Navigator);
    const { loader } = deferred();
    schedulePreload("sales", loader, "pointer");
    expect(loader).not.toHaveBeenCalled();
  });
});
