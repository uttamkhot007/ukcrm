// Manual + automatic cache cleanup utility.
//
// Unregisters all service workers, deletes all browser caches, clears
// redirect-loop sessionStorage, then hard-reloads to a target path with a
// cache-busting `?fresh=` query.

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
