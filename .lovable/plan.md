# Remove the legacy super-admin view

## Outcome
Platform administrators will have one canonical shell: the approved Platform Console. The workspace dashboard and legacy admin landing pages will no longer be renderable as a super-admin fallback after refresh, inactivity, BFCache restore, or stale navigation state.

## Implementation
1. **Make routing deterministic**
   - Replace the root-route effect redirect with a synchronous platform-admin route gate so the workspace dashboard cannot mount for an administrator, even briefly.
   - Remove the router-state exception that currently allows platform admins back into the old root dashboard.
   - Redirect platform-admin legacy `/admin` entry points to the canonical Platform Console landing page while preserving tenant workspace behavior for non-platform users.

2. **Strengthen the approved-design identity**
   - Raise the monotonic approved-design revision and include its revision/ID in the release manifest and HTML metadata.
   - Require the served release to advertise the approved design identity before accepting it as current; a mismatched legacy shell is treated as stale and replaced.
   - Keep auth, tenant, route, and theme state while clearing only stale presentation/query caches.

3. **Eliminate stale shell delivery paths**
   - Keep HTML, release metadata, and service-worker kill-switch files non-cacheable.
   - Tighten deployment verification so a rollout fails unless every active frontend task and the public release manifest carry the approved design identity.

4. **Regression coverage**
   - Test that platform admins can never render the workspace dashboard from `/`, router state, `/admin`, or BFCache restoration.
   - Test that legacy design revisions are rejected before React mounts and that the matching approved revision is accepted.

## Technical scope
Frontend routing, release/design metadata, stale-shell guard, AWS deployment verification, and focused automated tests. No database or business-data changes.