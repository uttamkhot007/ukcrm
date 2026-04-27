// Manual + automatic cache cleanup utility.
//
// Unregisters all service workers, deletes all browser caches, clears
// redirect-loop sessionStorage, then hard-reloads to a target path with a
// cache-busting query. The hard path also rewrites currently-known asset URLs
// so any visible badge/icons update immediately before navigation.

import { BUILD_TIME, BUILD_VERSION } from "@/lib/build-info";

declare global {
  interface Window {
    __NEXUS_HARD_RELOAD_LATEST__?: () => void;
    __NEXUS_BUILD_INFO__?: {
      version: string;
      buildTime: string;
      assetBust: string;
      updatedAt: string;
    };
  }
}

const ASSET_BUST_PARAM = "assetBust";

function appendCacheBust(value: string, rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, window.location.href);
    if (parsed.origin !== window.location.origin) return rawUrl;
    parsed.searchParams.set(ASSET_BUST_PARAM, value);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return rawUrl;
  }
}

export function rerenderBuildBadgeNow(assetBust = String(Date.now())): void {
  window.__NEXUS_BUILD_INFO__ = {
    version: BUILD_VERSION,
    buildTime: BUILD_TIME,
    assetBust,
    updatedAt: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent("nexus:build-info-updated", { detail: window.__NEXUS_BUILD_INFO__ }));
}

export function addCacheBustToKnownAssetUrls(assetBust = String(Date.now())): void {
  const selector = [
    "script[src]",
    'link[href][rel~="stylesheet"]',
    'link[href][rel="modulepreload"]',
    'link[href][rel="preload"]',
    "img[src]",
    "source[src]",
    "video[src]",
    "audio[src]",
  ].join(",");

  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    const attr = node.hasAttribute("src") ? "src" : "href";
    const value = node.getAttribute(attr);
    if (value) node.setAttribute(attr, appendCacheBust(assetBust, value));
  });

  rerenderBuildBadgeNow(assetBust);
}

export async function clearAllAppCaches(): Promise<void> {
  // 1. Unregister all service workers
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn("[cache-cleanup] SW unregister failed", e);
  }

  // 2. Delete all caches
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch (e) {
    console.warn("[cache-cleanup] caches.delete failed", e);
  }

  // 3. Clear loop-tracking session keys (don't nuke other session state)
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("redirect-loop:")) toRemove.push(k);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
}

export async function forceFreshReload(targetPath?: string): Promise<void> {
  await clearAllAppCaches();
  const path =
    targetPath ?? window.location.pathname + window.location.search;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${path}${sep}fresh=${Date.now()}`;
  window.location.replace(url);
}

export async function hardReloadLatestBuild(targetPath?: string): Promise<void> {
  const assetBust = `${BUILD_VERSION}-${Date.now()}`;
  addCacheBustToKnownAssetUrls(assetBust);
  await clearAllAppCaches();

  if (typeof window.__NEXUS_HARD_RELOAD_LATEST__ === "function") {
    window.__NEXUS_HARD_RELOAD_LATEST__();
    return;
  }

  const url = new URL(targetPath ?? window.location.href, window.location.href);
  url.searchParams.set("fresh", String(Date.now()));
  url.searchParams.set(ASSET_BUST_PARAM, assetBust);
  window.location.replace(url.toString());
}
