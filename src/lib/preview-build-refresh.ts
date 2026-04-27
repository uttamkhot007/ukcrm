import { BUILD_COMMIT, BUILD_TIME, BUILD_VERSION } from "@/lib/build-info";
import { hardReloadLatestBuild } from "@/lib/cache-cleanup";

const CURRENT_BUILD_ID = `${BUILD_VERSION}:${BUILD_TIME}:${BUILD_COMMIT}`;

function buildIdFromMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const version = payload.buildVersion ?? payload.version;
  const buildTime = payload.buildTime ?? payload.time;
  const commit = payload.commit ?? payload.buildCommit ?? "";
  if (typeof version === "string" && typeof buildTime === "string") {
    return `${version}:${buildTime}:${typeof commit === "string" ? commit : ""}`;
  }
  if (typeof payload.buildId === "string") return payload.buildId;
  return null;
}

export function installPreviewBuildRefreshHook(): void {
  if (typeof window === "undefined") return;

  window.__NEXUS_BUILD_INFO__ = {
    version: BUILD_VERSION,
    buildTime: BUILD_TIME,
    assetBust: CURRENT_BUILD_ID,
    updatedAt: new Date().toISOString(),
  };

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const type = (data as Record<string, unknown>).type;
    if (type !== "NEXUS_BUILD_CHANGED" && type !== "LOVABLE_BUILD_CHANGED" && type !== "NEXUS_PREVIEW_BUILD_INFO") return;

    const incomingBuildId = buildIdFromMessage(data);
    if (incomingBuildId && incomingBuildId !== CURRENT_BUILD_ID) {
      void hardReloadLatestBuild(window.location.pathname + window.location.search);
    }
  });

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