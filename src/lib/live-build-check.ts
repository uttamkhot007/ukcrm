/**
 * Pre-flight check: is the published (live) site serving an older build than
 * the one currently running in this tab?
 *
 * Works by fetching the live site's `index.html` and reading the
 * `<meta name="build-time">` tag that the Vite build injects, then comparing
 * it to the build time compiled into this bundle.
 *
 * The published origin may not send CORS headers, in which case the check
 * degrades gracefully to `unknown` instead of failing loudly.
 */

import { BUILD_TIME } from "@/lib/build-info";

export const LIVE_SITE_URL = "https://ukcrm.lovable.app";

export type LiveBuildStatus = "fresh" | "stale" | "unknown" | "same-origin";

export interface LiveBuildResult {
  status: LiveBuildStatus;
  localBuildTime: string;
  liveBuildTime: string | null;
  /** How far behind the live build is, in ms (positive = live is older). */
  behindMs: number | null;
  reason?: string;
  checkedAt: string;
}

const STORAGE_KEY = "nexus:live-build-check";
const TTL_MS = 5 * 60 * 1000;

function parseBuildTime(html: string): string | null {
  const match = html.match(
    /<meta[^>]+name=["']build-time["'][^>]+content=["']([^"']+)["']/i,
  );
  if (!match) return null;
  const value = match[1];
  if (!value || value.includes("__INDEX_HTML_BUILT__")) return null;
  return value;
}

function readCache(): LiveBuildResult | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveBuildResult;
    if (parsed.localBuildTime !== BUILD_TIME) return null;
    if (Date.now() - new Date(parsed.checkedAt).getTime() > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(result: LiveBuildResult) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function isOnLiveSite(): boolean {
  try {
    return window.location.origin === LIVE_SITE_URL;
  } catch {
    return false;
  }
}

export async function checkLiveBuild(
  options: { force?: boolean } = {},
): Promise<LiveBuildResult> {
  const base: Omit<LiveBuildResult, "status"> = {
    localBuildTime: BUILD_TIME,
    liveBuildTime: null,
    behindMs: null,
    checkedAt: new Date().toISOString(),
  };

  if (isOnLiveSite()) {
    return { ...base, status: "same-origin", reason: "Already on the live site." };
  }

  if (!options.force) {
    const cached = readCache();
    if (cached) return cached;
  }

  let result: LiveBuildResult;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${LIVE_SITE_URL}/index.html?preflight=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      result = {
        ...base,
        status: "unknown",
        reason: `Live site returned HTTP ${response.status}.`,
      };
    } else {
      const html = await response.text();
      const liveBuildTime = parseBuildTime(html);
      if (!liveBuildTime) {
        result = {
          ...base,
          status: "unknown",
          reason: "Live site did not expose a build timestamp.",
        };
      } else {
        const behindMs =
          new Date(BUILD_TIME).getTime() - new Date(liveBuildTime).getTime();
        result = {
          ...base,
          liveBuildTime,
          behindMs,
          // Allow 60s of clock/deploy skew before calling it stale.
          status: behindMs > 60_000 ? "stale" : "fresh",
        };
      }
    }
  } catch (error) {
    result = {
      ...base,
      status: "unknown",
      reason:
        error instanceof DOMException && error.name === "AbortError"
          ? "Live site check timed out."
          : "Live site could not be read from this origin (CORS or network).",
    };
  }

  writeCache(result);
  return result;
}

export function formatBehind(behindMs: number | null): string {
  if (behindMs === null) return "unknown";
  const mins = Math.round(behindMs / 60000);
  if (mins < 60) return `${mins} min behind`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h behind`;
  return `${Math.round(hours / 24)} d behind`;
}
