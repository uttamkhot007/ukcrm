# Permanently remove the old console

## Goal
Ensure administrators can only reach the current Platform Console and that no legacy admin shell can render from routing state, old links, or a mixed deployment.

## Changes
- Remove the parallel `admin-center-*` module path from the workspace router and sidebar flow; admin configuration will use only canonical `/admin/...` routes.
- Make the Platform Console the single admin landing shell and retain operational modules as explicit workspace destinations.
- Rename/extract the tenant management implementation so the new Platform Console no longer imports a page named as the legacy admin surface.
- Cover both historical service-worker paths with explicit no-cache delivery, while keeping them only as self-removing cache kill switches.
- Update obsolete integration callback defaults from `/admin-center` to the canonical integrations route.
- Advance the cache epoch and approved-design revision once, and update deployment verification to reject any older image.

## Verification
- Confirm no legacy dashboard component or `/admin-center` route/render path remains.
- Verify `/` redirects a platform admin to `/admin/platform/tenants` and all Platform Console tabs remain distinct.
- Run focused routing/stale-build tests and inspect the latest build diagnostics.
