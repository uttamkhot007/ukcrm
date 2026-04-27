I found two real code issues behind the repeated “same dashboard”/refresh problem:

1. The app is still using `profile.is_super_admin` as an access signal in the frontend and database helpers, even though roles are supposed to be authoritative in `user_roles`. This creates split-brain admin detection and race conditions between `useAuth`, `TenantContext`, `Index`, `AdminLayout`, and `PlatformLayout`.
2. The cache-killer code is duplicated in `index.html` and can race/reload before React fully stabilizes. In my browser check it produced a blank page with only the static build badge visible before later landing on `/auth`, meaning the cleanup flow itself can break the app experience.

Plan to fix it permanently:

1. Create one authoritative admin access model
   - Add a small frontend helper for role decisions, e.g. `isPlatformAdmin = role === "admin" || role === "super_admin"` / `isSuperAdmin = role === "super_admin"` as supported by the existing schema.
   - Stop using `portalMode === "admin"` as proof of admin access.
   - Stop using `profile.is_super_admin` as the main routing guard in app code; keep it only as backward-compatible metadata if needed.

2. Harden `useAuth` so auth/profile/role resolution is deterministic
   - Track separate resolved flags instead of relying on `null` values and a 6-second timeout.
   - Fetch profile, all role rows, teams, and console access in one guarded sequence per session.
   - Make `getRedirectPath()` return `/admin/platform/tenants` for admin/platform users, not `/admin`.
   - Ensure sign-in and initial page refresh use the same redirect logic.

3. Fix root route behavior (`/`)
   - Replace the current effect-based redirect with a decisive guarded render:
     - while auth/role/tenant is unresolved: show loading only
     - if unauthenticated: navigate to `/auth`
     - if platform admin: navigate to `/admin/platform/tenants`
     - otherwise: render tenant/workspace dashboard
   - Remove the timeout path that can incorrectly proceed to the tenant dashboard before role data is ready.

4. Fix admin/platform route guards
   - Update `AdminLayout` and `PlatformLayout` to use the same centralized admin helper.
   - Prevent any redirect back to `/` until auth and role are fully resolved.
   - Keep `/admin/platform/*` matched only through the nested admin route to avoid duplicate route/layout behavior.

5. Fix the sidebar/header confusion
   - For platform admins, show the Platform Console navigation consistently.
   - Make the Dashboard sidebar item route to the correct admin landing page instead of sending platform admins back to the tenant dashboard.
   - Keep workspace/customer preview modes as view modes only, not access-control signals.

6. Remove the fragile duplicate cache-killer path
   - Consolidate the HTML cache cleanup to one script path.
   - Wait for self-destruct service worker activation before reload, but only do one guarded reload per build.
   - Ensure React mount is not hidden by stale cleanup state and the static build badge only appears when React actually fails.

7. Add temporary targeted diagnostics for this issue
   - Add concise console logs for: auth resolved, role resolved, root redirect target, admin guard decision.
   - These logs can confirm the real route decision if the issue appears again; they will not include tokens or secrets.

8. Verify before final response
   - Run TypeScript/build checks.
   - Verify `/` redirects to `/admin/platform/tenants` for the current Uttam admin record.
   - Verify refreshing `/` and `/admin/platform/tenants` does not show the tenant dashboard.
   - Verify the white-screen/static-badge-only state is gone.

Technical notes:
- The current database record for Uttam is already correct: role `admin`, `is_super_admin = true`, tenant assigned.
- The fix should focus on app state/routing/cache code, not changing that user record.
- I will not edit generated backend client/type files.