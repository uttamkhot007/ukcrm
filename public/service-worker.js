// Kill-switch service worker.
//
// This app does NOT use an app-shell service worker. Older builds shipped one
// (registered for push handling) that cached HTML and intercepted navigations,
// which is why returning users kept seeing an outdated view after deploys.
//
// Deleting the worker source is not enough: browsers that already have a
// registration keep the old worker alive until a replacement is served at the
// SAME path. This file is that replacement. Every browser that still holds a
// registration will, on its next update check:
//
//   1. install and skip waiting immediately,
//   2. delete the app-shell caches this registration owns,
//   3. take control, force every open tab to re-navigate against the network,
//   4. unregister itself — permanently.
//
// There is intentionally NO fetch handler: while this worker is alive it must
// never serve a single byte from cache.

// Cache Storage is origin-scoped, so a blanket wipe would also destroy caches
// owned by other workers (e.g. Firebase Messaging). Delete only the buckets the
// app shell created: Workbox-generated names plus the legacy hand-rolled ones.
const APP_CACHE_PATTERNS = [
  /(^|-)precache-v\d+-/, // workbox precache
  /(^|-)runtime-/, // workbox runtime
  /(^|-)googleAnalytics-/, // workbox analytics
  /^workbox-/,
  /^nexus[-_]/, // legacy app-shell caches
  /^app-shell/,
  /^static-/,
  /^pages?-cache/,
  /^assets?-cache/,
  /^vite-pwa/,
];

// Never touch caches owned by messaging / third-party integrations.
const PRESERVED_CACHE_PATTERNS = [/firebase/i, /fcm/i, /onesignal/i, /messaging/i];

function isAppShellCache(name) {
  if (PRESERVED_CACHE_PATTERNS.some((pattern) => pattern.test(name))) return false;
  if (APP_CACHE_PATTERNS.some((pattern) => pattern.test(name))) return true;
  // Workbox suffixes its buckets with the registration scope; anything scoped to
  // this registration was created by the app shell worker we are replacing.
  return name.endsWith(self.registration.scope);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const stale = cacheNames.filter(isAppShellCache);
        await Promise.allSettled(stale.map((name) => caches.delete(name)));

        await self.clients.claim();

        // Re-navigate open tabs so nobody keeps looking at HTML that the old
        // worker served from cache.
        const windowClients = await self.clients.matchAll({ type: 'window' });
        await Promise.allSettled(
          windowClients.map((client) => (client.navigate ? client.navigate(client.url) : null)),
        );
      } finally {
        // `activate` fires only once — unregistering in `finally` guarantees the
        // registration can never be stranded by an earlier failure.
        await self.registration.unregister();
      }
    })(),
  );
});
