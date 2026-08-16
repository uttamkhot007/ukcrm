// Build metadata injected by Vite's `define` config (see vite.config.ts).
// Falls back to safe defaults when running outside a built bundle.

declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: string;
declare const __APP_COMMIT__: string;
declare const __APP_RELEASE_ID__: string;
declare const __APP_RELEASE_REVISION__: number;
declare const __APP_ENVIRONMENT__: string;

const safeGet = (factory: () => string, fallback: string) => {
  try {
    const v = factory();
    return v && typeof v === "string" ? v : fallback;
  } catch {
    return fallback;
  }
};

export const BUILD_VERSION = safeGet(() => __APP_VERSION__, "0.0.0");
export const BUILD_TIME = safeGet(() => __APP_BUILD_TIME__, new Date().toISOString());
export const BUILD_COMMIT = safeGet(() => __APP_COMMIT__, "dev");
export const RELEASE_ID = safeGet(
  () => (typeof window !== "undefined" && window.__NEXUS_RELEASE_ID__) || __APP_RELEASE_ID__,
  `${BUILD_COMMIT}:${BUILD_TIME}`,
);
export const RELEASE_REVISION = (() => {
  try {
    const value = typeof window !== "undefined" ? window.__NEXUS_RELEASE_REVISION__ : undefined;
    return Number.isFinite(value) ? Number(value) : __APP_RELEASE_REVISION__;
  } catch {
    return 0;
  }
})();
export const BUILD_ENVIRONMENT = safeGet(() => __APP_ENVIRONMENT__, "development");

/** Compact label for the build badge: "v0.0.0 · 26 Apr 14:32". */
export function formatBuildLabel(): string {
  let when = "";
  try {
    const d = new Date(BUILD_TIME);
    if (!Number.isNaN(d.getTime())) {
      when = d.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    when = BUILD_TIME;
  }
  return `v${BUILD_VERSION}${when ? " · " + when : ""}`;
}

export function getFullBuildInfo() {
  return {
    version: BUILD_VERSION,
    buildTime: BUILD_TIME,
    commit: BUILD_COMMIT,
    releaseId: RELEASE_ID,
    releaseRevision: RELEASE_REVISION,
    environment: BUILD_ENVIRONMENT,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
    href: typeof window !== "undefined" ? window.location.href : "n/a",
  };
}
