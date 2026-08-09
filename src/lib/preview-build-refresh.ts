import { BUILD_COMMIT, BUILD_TIME, BUILD_VERSION } from "@/lib/build-info";

const CURRENT_BUILD_ID = `${BUILD_VERSION}:${BUILD_TIME}:${BUILD_COMMIT}`;


export function installPreviewBuildRefreshHook(): void {
  if (typeof window === "undefined") return;

  window.__NEXUS_BUILD_INFO__ = {
    version: BUILD_VERSION,
    buildTime: BUILD_TIME,
    assetBust: CURRENT_BUILD_ID,
    updatedAt: new Date().toISOString(),
  };

  // NOTE: we intentionally do NOT auto-reload on build messages any more.
  // The previous handler reloaded whenever the preview shell announced a
  // build id, which raced with HMR and repeatedly bounced the tab back onto
  // an older cached document. Reloading is now a user action only.


  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "NEXUS_PREVIEW_BUILD_READY",
          buildId: CURRENT_BUILD_ID,
          buildVersion: BUILD_VERSION,
          buildTime: BUILD_TIME,
          commit: BUILD_COMMIT,
          href: window.location.href,
        },
        "*"
      );
    }
  } catch {
    // Cross-origin preview frames can block parent access; ignore safely.
  }
}