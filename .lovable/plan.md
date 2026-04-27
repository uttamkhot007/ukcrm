## What you're seeing in the screenshot

You're on `/admin/platform/tenants` but the page is rendering **only** the inner `AdminTenants` table — the purple **Platform Console** banner, the **Tenants / User Management / License Management / Integrations / System Status** sub-tabs, AND the new **Build Version badge** in the bottom-left are all missing.

That's the smoking gun: your browser is still running an **old JS bundle** that pre-dates the `PlatformLayout` wrapper and the `BuildVersionBadge`. The fixes from the last round shipped to the codebase but never reached your browser.

## Why the previous fix didn't actually work

The "self-destruct service worker" only purges itself **after the new `/sw.js` is downloaded and activated by the browser**. But:

1. Nothing in the current code calls `navigator.serviceWorker.register('/sw.js')` anymore (we made `usePushNotifications` a no-op), so **the browser never fetches the new self-destruct SW**.
2. The OLD SW that was already installed weeks ago is still alive, intercepting `index.html` and JS requests, and serving cached responses.
3. Result: the new self-destruct logic never runs, and the legacy cleanup in `main.tsx` never runs either (because old `main.tsx` is what's being served).

It's a chicken-and-egg problem: the only code that can clean things up lives in the bundle that's stuck behind the cache.

## The permanent fix

Break the cycle **before any React code loads** by putting the cleanup in two places that the cache can't intercept: an **inline `<script>` in `index.html`** and an **explicit re-registration of the new self-destruct SW**.

### 1. Inline cache-killer in `index.html` (runs before bundle loads)

Add a small `<script>` block at the top of `<body>` that runs synchronously on every page load:

- Unregister every service worker registration
- Delete every `caches` entry  
- **Re-register `/sw.js?v=<timestamp>`** so the new self-destruct SW actually gets installed and can claim/clean any clients still holding the old one
- If `?fresh=...` is NOT in the URL and we just unregistered something OR found old caches, force `location.reload(true)` once to ensure the next request bypasses any in-flight HTML cache

Because this script lives in `index.html` (which has `Cache-Control: no-cache, no-store, must-revalidate`) and runs before the `<script type="module" src="/src/main.tsx">` tag, it works even if the bundle itself is stale.

### 2. Add a versioned SW import to force a real fetch

The browser only re-checks `/sw.js` when something registers it. Add a tiny inline `register('/sw.js?v=<BUILD_TIME>')` call in `index.html` (or a 5-line `public/sw-bootstrap.js`). The `?v=` query forces the browser to treat it as a different SW URL → guaranteed fresh fetch → install → activate → self-destruct → clean state.

### 3. Add an HTTP-level no-cache hint for `/sw.js` and `/index.html`

Update `nginx/default.conf` so Nginx returns `Cache-Control: no-store` for `index.html` AND `sw.js`. Without this, even after we fix the JS, an intermediate proxy or browser HTTP cache could still serve stale copies of those files. Asset chunks (under `/assets/...`) keep their long-lived hashed-file caching — those are safe.

### 4. Promote the BuildVersionBadge into `index.html` as a static fallback

Inject a tiny static `<div>` in `index.html` showing the build timestamp (filled in by the inline script reading `window.__BUILD_TIME__` set via `<meta>`). That way you can confirm the latest HTML loaded **even if the React bundle never mounts**. Once React mounts, the rich `BuildVersionBadge` component takes over and hides the static one.

### 5. Tell `AdminTenants` to detect "I'm rendered without my PlatformLayout shell" and self-recover

If `AdminTenants` is mounted at `/admin/platform/tenants` but the surrounding `PlatformLayout` banner element isn't in the DOM (we'll add a `data-platform-shell="1"` attribute to detect it), it means the user is on a stale bundle that nested routes incorrectly. In that case, call `forceFreshReload('/admin/platform/tenants')` automatically. One-time guard via `sessionStorage` prevents loops.

## What you'll see after this ships

- Within seconds of opening the preview, the inline script wipes the old SW + caches and reloads once. After the reload, the new bundle loads with the purple Platform Console banner, the sub-tabs, and the BuildVersionBadge in the bottom-left.
- The badge will show a new build timestamp (e.g. `v0.0.0 · 27-Apr 09:14`) — if it doesn't update on a future change, you'll know immediately.
- If something ever goes stale again, just click the badge and hit **Clear cache & reload latest build**.

## Files to change

**Edited**
- `index.html` — add inline cache-killer `<script>`, versioned SW registration, static build-time fallback badge, `<meta name="build-time">`
- `public/sw.js` — keep self-destruct logic; add explicit cache-buster header in response (already mostly done)
- `nginx/default.conf` — `Cache-Control: no-store` for `index.html` and `sw.js`, keep long cache for `/assets/*`
- `src/pages/admin/platform/PlatformLayout.tsx` — add `data-platform-shell="1"` marker to root div
- `src/pages/admin/AdminTenants.tsx` — add "missing shell" detector that triggers `forceFreshReload` once
- `src/main.tsx` — keep existing cleanup; remove the now-redundant duplicate logic

**No new files needed.**

## Out of scope

- Adding back PWA / push notifications (still deferred until cache story is solid)
- Any backend or Supabase changes
