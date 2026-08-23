# Permanently block the legacy dashboard for platform admins

## What will change
- Make the root route resolve administrators directly to the Platform Console before the workspace shell or legacy dashboard can mount.
- Add a second guard inside the dashboard itself so it can never render for a platform administrator, even from restored router state or an old navigation path.
- Remove the Dashboard item from the super-admin/admin console navigation while preserving access to operational modules such as Sales, Finance, HR, and Projects.
- Advance the approved-design and cache epochs together so browsers that previously loaded the old shell purge it once and accept only the new revision.

## Validation
- Open `/` as the authenticated superadmin and confirm the final route is `/admin/platform/tenants` with no “Welcome back” dashboard paint.
- Exercise navigation from the Platform Console into an operational module and back.
- Run focused tests and confirm the preview build is clean.

## Technical details
- Keep tenant workspace dashboards available for non-platform users.
- Preserve explicit operational-module navigation for platform admins; only the obsolete root dashboard is blocked.
- Use render-time redirects in addition to effect-based navigation to eliminate race conditions and BFCache restoration flashes.
