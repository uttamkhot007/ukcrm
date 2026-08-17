// @vitest-environment jsdom
/**
 * Stale-bundle recovery regression suite.
 *
 * Simulates users who arrive with older cached assets — an old shell out of the
 * HTTP/bfcache, an old service-worker registration, or a lagging server task —
 * and proves each of them is forcibly moved to the newest release:
 *
 *   1. release floor: an old bundle that boots is purged and reloaded
 *   2. watcher: a newer served release triggers a cache-clearing reload
 *   3. rolling deploys: an *older* served release never downgrades a fresh tab
 *   4. build change: app caches and build-scoped storage are purged
 *   5. loop safety: reloads are capped so recovery can never spin
 *   6. telemetry: every block is logged with release ids and the session id
 *   7. kill-switch service worker: purges its caches, re-navigates tabs,
 *      unregisters itself
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const OLD_TIME = "2026-08-01T10:00:00.000Z";
const NEW_TIME = "2026-08-15T10:00:00.000Z";

let buildTime = OLD_TIME;
let buildCommit = "oldcommit";

vi.mock("@/lib/build-info", () => ({
  get BUILD_TIME() {
    return buildTime;
  },
  get BUILD_COMMIT() {
    return buildCommit;
  },
  BUILD_VERSION: "1.0.0",
  get RELEASE_ID() {
    return `1.0.0|${buildCommit}|${buildTime}`;
  },
  RELEASE_REVISION: 0,
  BUILD_ENVIRONMENT: "production",
}));

vi.mock("@/lib/ui-persistence", () => ({
  purgeObsoletePresentationState: vi.fn(),
}));

const forceFreshReload = vi.fn(async () => {});
vi.mock("@/lib/cache-cleanup", () => ({
  forceFreshReload,
  clearAllAppCaches: vi.fn(async () => {}),
  hardReloadLatestBuild: vi.fn(async () => {}),
}));

const insert = vi.fn(async (_rows?: unknown) => ({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "user-1" } } } }) },
    from: () => ({ insert }),
  },
}));

/** Minimal Cache Storage double so we can assert what got purged. */
function installCacheStorage(names: string[]) {
  const buckets = new Set(names);
  const caches = {
    keys: vi.fn(async () => Array.from(buckets)),
    delete: vi.fn(async (name: string) => buckets.delete(name)),
  };
  vi.stubGlobal("caches", caches);
  return { buckets, caches };
}

const reload = vi.fn();

function servedManifest(time: string, commit: string, revision = 0) {
  return JSON.stringify({
    releaseId: `1.0.0|${commit}|${time}`,
    revision,
    buildTime: time,
    commit,
    environment: "production",
    uiSchemaVersion: "3",
  });
}

function manifestResponse(time: string, commit: string, revision = 0, status = 200) {
  return new Response(servedManifest(time, commit, revision), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function servedHtml(time: string, commit: string, revision = 0) {
  return `<!doctype html><html><head>
    <meta name="build-time" content="${time}">
    <meta name="build-commit" content="${commit}">
    <meta name="release-id" content="1.0.0|${commit}|${time}">
    <meta name="release-revision" content="${revision}">
    <meta name="release-environment" content="production">
    <meta name="ui-schema-version" content="3">
  </head></html>`;
}

async function loadStrategy() {
  return import("@/lib/build-cache-strategy");
}

async function loadTelemetry() {
  return import("@/lib/release-floor-telemetry");
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  buildTime = OLD_TIME;
  buildCommit = "oldcommit";

  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      origin: "http://localhost:8080",
      href: "http://localhost:8080/dashboard",
      pathname: "/dashboard",
      search: "",
      hash: "",
      reload,
      replace: vi.fn(),
    },
  });

  installCacheStorage([]);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Pretend this browser already ran (or saw) the newest release. */
function seedReleaseFloor(time = NEW_TIME, id = `1.0.0|newcommit|${time}`) {
  localStorage.setItem("nexus:release-floor", JSON.stringify({ time: Date.parse(time), id }));
}

describe("returning user boots an outdated bundle", () => {
  it("refuses to render it: purges caches and reloads", async () => {
    seedReleaseFloor();
    const { enforceReleaseFloor, isRunningBuildBelowFloor } = await loadStrategy();

    expect(isRunningBuildBelowFloor()).toBe(true);
    expect(enforceReleaseFloor()).toBe(true);
    await vi.waitFor(() => expect(forceFreshReload).toHaveBeenCalledTimes(1));
  });

  it("records the block with both release ids and the session id", async () => {
    seedReleaseFloor();
    const { enforceReleaseFloor } = await loadStrategy();
    const { getReleaseFloorLog, getTelemetrySessionId } = await loadTelemetry();

    enforceReleaseFloor();

    const [event] = getReleaseFloorLog();
    expect(event.eventKind).toBe("boot_blocked");
    expect(event.action).toBe("purge_and_reload");
    expect(event.runningReleaseId).toContain(OLD_TIME);
    expect(event.floorReleaseId).toContain("newcommit");
    expect(event.floorBuildTime).toBe(NEW_TIME);
    expect(event.sessionId).toBe(getTelemetrySessionId());
    expect(event.pageUrl).toBe("/dashboard");
  });

  it("queues the block for the database and ships it after the reload", async () => {
    seedReleaseFloor();
    const { enforceReleaseFloor } = await loadStrategy();
    enforceReleaseFloor();

    const { flushReleaseFloorTelemetry } = await loadTelemetry();
    await flushReleaseFloorTelemetry();

    expect(insert).toHaveBeenCalled();
    const rows = insert.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
    const blocked = rows.find((row) => row.event_kind === "boot_blocked");
    expect(blocked).toMatchObject({ user_id: "user-1", action: "purge_and_reload" });
    expect(String(blocked?.session_id).length).toBeGreaterThanOrEqual(8);
    // Never log secrets — only release identity and coarse context.
    expect(Object.keys(blocked ?? {})).not.toContain("access_token");
  });

  it("lets a current bundle through and raises the floor", async () => {
    buildTime = NEW_TIME;
    buildCommit = "newcommit";
    const { enforceReleaseFloor } = await loadStrategy();

    expect(enforceReleaseFloor()).toBe(false);
    expect(forceFreshReload).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("nexus:release-floor")!).time).toBe(Date.parse(NEW_TIME));
  });
});

describe("watcher against the deployed release", () => {
  it("forces a cache-clearing reload when the server is ahead", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => manifestResponse(NEW_TIME, "newcommit")),
    );
    const strategy = await loadStrategy();
    const stop = strategy.watchServedBuild();
    await vi.waitFor(() => expect(forceFreshReload).toHaveBeenCalledTimes(1));
    stop();
  });

  it("never downgrades a fresh tab when a lagging task serves an older release", async () => {
    buildTime = NEW_TIME;
    buildCommit = "newcommit";
    seedReleaseFloor(NEW_TIME);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => manifestResponse(OLD_TIME, "oldcommit")),
    );

    const strategy = await loadStrategy();
    const { getReleaseFloorLog } = await loadTelemetry();
    const stop = strategy.watchServedBuild();

    await vi.waitFor(() =>
      expect(getReleaseFloorLog().some((e) => e.eventKind === "downgrade_prevented")).toBe(true),
    );
    expect(forceFreshReload).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    stop();
  });

  it("caps reloads so recovery can never loop", async () => {
    const { requestReleaseReload } = await loadStrategy();
    const results = [1, 2, 3, 4, 5].map(() => {
      const ok = requestReleaseReload("release-x");
      // the arbiter latches after a successful request; clear it per attempt
      return ok;
    });
    expect(results[0]).toBe(true);
    expect(results.slice(1).every((r) => r === false)).toBe(true);
  });

  it("replaces a preview revision missed while the tab was suspended", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => manifestResponse(OLD_TIME, "oldcommit", 3)),
    );
    const strategy = await loadStrategy();
    const stop = strategy.watchServedBuild();
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(forceFreshReload).toHaveBeenCalledTimes(1));
    stop();
  });

  it("blocks application mount when the boot manifest is newer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => manifestResponse(NEW_TIME, "newcommit")),
    );
    const strategy = await loadStrategy();
    await expect(strategy.installBuildCacheStrategy()).resolves.toBe(false);
    await vi.waitFor(() => expect(forceFreshReload).toHaveBeenCalledTimes(1));
  });

  it("uses no-store HTML metadata when the manifest is missing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(new Response(servedHtml(NEW_TIME, "newcommit"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const strategy = await loadStrategy();
    const served = await strategy.fetchServedBuild();

    expect(served.source).toBe("html");
    expect(served.id).toContain("newcommit");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a 200 HTML interstitial returned as the manifest and falls back", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>challenge</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }))
      .mockResolvedValueOnce(new Response(servedHtml(OLD_TIME, "oldcommit"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchServedBuild } = await loadStrategy();
    await expect(fetchServedBuild()).resolves.toMatchObject({ source: "html", commit: "oldcommit" });
  });

  it("preserves the approved shell when both online probes fail twice", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", { status: 404 })));
    const strategy = await loadStrategy();

    await expect(strategy.installBuildCacheStrategy()).resolves.toBe(true);

    expect(strategy.getReleaseVerificationState().status).toBe("verified");
    expect(document.documentElement.hasAttribute("data-release-unverified")).toBe(false);
    expect(strategy.getReleaseCoherenceDiagnostics()[0]).toMatchObject({
      decision: "preserved",
      attempts: 2,
    });
  });
});

describe("cached assets from a previous build", () => {
  it("purges every cache bucket and build-scoped storage on a new build", async () => {
    const { buckets } = installCacheStorage(["workbox-precache-v2", "nexus-app-shell"]);
    localStorage.setItem("nexus:last-build-id", "1.0.0|ancient|2026-01-01T00:00:00.000Z");
    localStorage.setItem("nexus-query-cache", "{}");
    localStorage.setItem("nexus:build-scoped:tabs", "{}");
    localStorage.setItem("nexus-theme", "light");

    const { purgeCachesOnNewBuild } = await loadStrategy();
    await expect(purgeCachesOnNewBuild()).resolves.toBe(true);

    expect(buckets.size).toBe(0);
    expect(localStorage.getItem("nexus-query-cache")).toBeNull();
    expect(localStorage.getItem("nexus:build-scoped:tabs")).toBeNull();
    // The theme is explicitly safelisted from build purges.
    expect(localStorage.getItem("nexus-theme")).toBe("light");
  });

  it("does nothing when the build is unchanged", async () => {
    const { RUNNING_BUILD_ID, purgeCachesOnNewBuild } = await loadStrategy();
    localStorage.setItem("nexus:last-build-id", RUNNING_BUILD_ID);
    await expect(purgeCachesOnNewBuild()).resolves.toBe(false);
  });
});

describe("kill-switch service worker", () => {
  /** Execute public/sw.js against a fake ServiceWorkerGlobalScope. */
  async function runWorker(cacheNames: string[]) {
    const source = readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");
    const buckets = new Set(cacheNames);
    const deleted: string[] = [];
    const navigated: string[] = [];
    const listeners: Record<string, (event: unknown) => void> = {};
    const unregister = vi.fn(async () => true);
    const skipWaiting = vi.fn();

    const self = {
      addEventListener: (type: string, fn: (event: unknown) => void) => {
        listeners[type] = fn;
      },
      skipWaiting,
      registration: { scope: "http://localhost:8080/", unregister },
      clients: {
        claim: vi.fn(async () => {}),
        matchAll: vi.fn(async () => [
          { url: "http://localhost:8080/dashboard", navigate: async (url: string) => void navigated.push(url) },
        ]),
      },
    };
    const caches = {
      keys: async () => Array.from(buckets),
      delete: async (name: string) => {
        deleted.push(name);
        return buckets.delete(name);
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function("self", "caches", source)(self, caches);

    listeners.install?.({ waitUntil: (p: Promise<unknown>) => p });
    let activation: Promise<unknown> = Promise.resolve();
    listeners.activate?.({ waitUntil: (p: Promise<unknown>) => (activation = p) });
    await activation;

    return { deleted, navigated, unregister, skipWaiting, buckets };
  }

  it("skips waiting, drops app-shell caches, re-navigates tabs and unregisters", async () => {
    const { deleted, navigated, unregister, skipWaiting } = await runWorker([
      "workbox-precache-v2-http://localhost:8080/",
      "nexus-app-shell",
      "static-assets",
    ]);

    expect(skipWaiting).toHaveBeenCalled();
    expect(deleted).toEqual(
      expect.arrayContaining(["workbox-precache-v2-http://localhost:8080/", "nexus-app-shell", "static-assets"]),
    );
    expect(navigated).toEqual(["http://localhost:8080/dashboard"]);
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it("leaves messaging caches owned by other workers alone", async () => {
    const { deleted } = await runWorker(["firebase-messaging-sw-cache", "onesignal-cache", "nexus-app-shell"]);
    expect(deleted).toEqual(["nexus-app-shell"]);
  });

  it("serves no request: it registers no fetch handler", () => {
    const source = readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");
    expect(source).not.toMatch(/addEventListener\(\s*['"]fetch['"]/);
  });
});
