// Self-destruct service worker.
//
// The previous service worker registered for push notifications was caching
// the app shell and intercepting navigations, which caused super-admins to
// see stale "old format" UI even after deploys.
//
// This worker exists ONLY to clean up after itself: any browser that still
// has /sw.js registered will:
//   1. Skip waiting on install
//   2. On activate: delete every cache and unregister itself
//
// The page-level cache-killer waits for this worker to reach `activated`
// before it reloads. This worker intentionally does NOT navigate clients,
// because doing that here can race ahead of the page before activation is
// observable.
//
// Once everyone has loaded the app at least once after this change,
// no service worker will be running anywhere.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (e) {
      // ignore
    }

    try {
      await self.registration.unregister();
    } catch (e) {
      // ignore
    }

  })());
});

// Intentionally NO fetch handler — the SW must not intercept any request.
