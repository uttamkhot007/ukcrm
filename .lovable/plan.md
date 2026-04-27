## Goal

Eliminate stale-bundle issues for super-admins by (1) ensuring no offline/PWA caching is active, (2) auto-recovering from root↔dashboard redirect loops, (3) giving you a manual "force fresh build" button, and (4) showing the current build version on every page so you can confirm what's loaded.

## What you'll see

- A small **build badge** in the bottom-left of every page showing version + short commit/build timestamp (e.g. `v0.0.0 · 26-Apr 14:32`). Click it to expand and see a **"Clear cache & reload"** button plus the build hash.
- If a redirect loop is detected (root → /admin/platform/tenants bouncing 3+ times in 10 seconds), the app automatically purges caches, unregisters the service worker, and does a hard reload to `/admin/platform/tenants?fresh=1`.
- Admin routes will always be served fresh from the network — no service worker can intercept them.

---

## Plan

### 1. Kill all caching for the admin shell (permanent)

- **`index.html`** — remove the `<link rel="manifest">` and `apple-touch-icon` PWA tags so browsers stop treating the app as installable/offline-capable. Add `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">` so the HTML shell is never cached.
- **`public/manifest.json`** — neutralize it (empty manifest with `display: "browser"`) so any cached install references stop standalone behavior.
- **`public/sw.js`** — replace the existing notifications SW with a **self-destruct SW**: on `install`/`activate` it deletes all caches, calls `self.registration.unregister()`, and reloads all clients. (This guarantees any browser still holding the old SW will purge itself on next visit.)
- **`src/hooks/usePushNotifications.ts`** — stop registering `/sw.js`. Push notifications will be disabled until a fresh, scoped SW is reintroduced (the current one was the source of the staleness). The hook becomes a no-op that returns `supported: false`.
- **`src/main.tsx`** — keep the existing `clearLegacyAppCaches()` and additionally call `caches.delete` on every page load (cheap, runs once).

### 2. Build version surfaced everywhere

- **`vite.config.ts`** — inject build metadata via `define`:
  - `__APP_VERSION__` from `package.json` version
  - `__APP_BUILD_TIME__` from `new Date().toISOString()` at build time
  - `__APP_COMMIT__` from `process.env.LOVABLE_COMMIT_SHA` if available, else `'dev'`
- **`src/lib/build-info.ts`** (new) — exports `BUILD_VERSION`, `BUILD_TIME`, `BUILD_COMMIT`, plus a `formatBuildLabel()` helper.
- **`src/components/system/BuildVersionBadge.tsx`** (new) — fixed bottom-left pill (`z-[60]`, low-opacity until hover). Click expands a popover showing:
  - Full build label
  - Current route
  - **"Clear cache & reload"** button (calls the cleanup util from step 3)
  - **"Copy build info"** button
- Mount `<BuildVersionBadge />` in `src/App.tsx` next to `<AuthDiagnosticsGate />` so it renders on every route including `/auth`.

### 3. Manual cache-cleanup utility

- **`src/lib/cache-cleanup.ts`** (new) — exports `forceFreshReload(targetPath?: string)`:
  1. Unregister all service workers
  2. Delete all `caches` entries
  3. Clear `sessionStorage` keys prefixed with `redirect-loop:`
  4. `window.location.replace(targetPath ?? window.location.pathname + '?fresh=' + Date.now())`
- Used by both the manual badge button and the auto-recovery in step 4.

### 4. Redirect-loop safeguard

- **`src/lib/redirect-loop-guard.ts`** (new) — exports `recordRedirect(from, to)` and `shouldForceCleanup()`.
  - Stores a sliding window of `{from, to, t}` entries in `sessionStorage` under `redirect-loop:history` (keep last 10, drop entries older than 10s).
  - Returns `true` when the same `from→to` pair has fired **3+ times within 10 seconds**.
- **`src/pages/Index.tsx`** — before each `navigate("/admin/platform/tenants", …)` call, invoke `recordRedirect("/", "/admin/platform/tenants")`. If `shouldForceCleanup()` returns true, call `forceFreshReload("/admin/platform/tenants")` instead of `navigate(...)`.
- **`src/pages/admin/platform/PlatformLayout.tsx`** (and `AdminLayout` if it has a similar redirect) — same instrumentation for any redirect that could feed the loop (e.g. `/admin/platform` → `/admin/platform/tenants`).
- **`src/components/auth/AuthDiagnosticsPanel.tsx`** — surface the loop history (last 5 entries) so you can see exactly which pair was bouncing.

### 5. Verify admin routes always fetch fresh JS

- The Vite dev server already emits hashed asset URLs and `Cache-Control: no-cache` for the HTML shell; with the SW removed and the manifest neutralized, nothing will intercept fetches.
- Add a sanity check in `src/main.tsx`: on startup, log `[build] vX.Y.Z @ <time>` so you can confirm the bundle in the console matches the badge.

---

## Technical notes

- **Why remove `usePushNotifications` SW registration entirely**: the existing `/sw.js` had a generic `activate` handler that was claiming clients on every navigation. Even after the recent activate-time cache purge, browsers that registered it before still hold the old version until the new SW fully activates — which is exactly the "old format" symptom. A self-destruct SW + no new registration is the only way to guarantee permanent cleanup. We can reintroduce push notifications later with a scoped, versioned SW (e.g. `/push-sw.js` registered only for users who opt in).
- **Why `sessionStorage` for the loop guard** (not in-memory): full-page reloads from cache cleanup must still remember recent attempts, otherwise the recovery itself could loop.
- **Build version in production AWS bundle**: `__APP_VERSION__` is statically replaced at build time, so it works identically in the AWS production bundle (no runtime env dependency).
- **No new dependencies** — all work uses existing React/Vite primitives.

## Files

**New**
- `src/lib/build-info.ts`
- `src/lib/cache-cleanup.ts`
- `src/lib/redirect-loop-guard.ts`
- `src/components/system/BuildVersionBadge.tsx`

**Edited**
- `index.html` (remove PWA tags, add no-cache meta)
- `public/manifest.json` (neutralize)
- `public/sw.js` (self-destruct SW)
- `src/hooks/usePushNotifications.ts` (no-op)
- `src/main.tsx` (startup log, keep cleanup)
- `vite.config.ts` (define build constants)
- `src/App.tsx` (mount BuildVersionBadge)
- `src/pages/Index.tsx` (loop-guarded redirects)
- `src/pages/admin/platform/PlatformLayout.tsx` (loop-guarded redirects)
- `src/components/auth/AuthDiagnosticsPanel.tsx` (show loop history)

## Out of scope

- Re-enabling push notifications (will be a follow-up with a separate scoped SW).
- Any backend / Supabase changes — this is entirely client-side.