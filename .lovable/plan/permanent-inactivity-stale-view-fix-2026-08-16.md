# Permanent inactivity stale-view fix

## Goal
Ensure that returning to NexusCRM after minutes or days always resumes the latest application release. An old in-memory React tree, BFCache snapshot, preview revision, or production container must never be accepted as current.

## Confirmed root cause
- The current preview runs as a development build, and `installBuildCacheStrategy()` explicitly disables the release-floor boot guard and automatic reload in development. Therefore the preview can restore an old in-memory UI after suspension without replacing it.
- Preview build identity is created only when Vite starts. Hot updates do not advance that identity, so a resumed tab can compare as “same” even when its UI code is obsolete.
- The currently published HTML reports build commit `dev`. The AWS Docker build also does not pass the commit into the image build, despite Vite expecting `GITHUB_SHA`/`LOVABLE_COMMIT_SHA`. Build time can detect some changes, but release identity is not deterministic or traceable to deployed source.
- Resume listeners already cover visibility, focus, online, and BFCache `pageshow`; however, the version banner performs a second independent check/reload flow. This creates overlapping ownership instead of one authoritative decision path.
- HTML is already non-cacheable and assets are content-hashed. The remaining failure is release identity and lifecycle control, not the database or normal asset-cache headers.

## Implementation
1. **Create a trustworthy release manifest**
   - Generate one same-origin release manifest containing a deterministic source/release ID, commit, build time, UI schema version, and environment.
   - In production, inject the actual commit/release ID into the Docker build and fail deployment verification if it is `dev`, missing, or inconsistent with the built HTML and JavaScript.
   - In preview, expose a revision that advances when source files change, so a tab suspended through hot updates can detect that it is obsolete when it wakes.
   - Serve the manifest with `no-store` headers and a unique probe query.

2. **Use one release-coherence controller everywhere**
   - Enable stale-release enforcement in preview as well as production; development should avoid reloads only while a tab is actively receiving HMR, not after a suspended tab misses a revision.
   - On boot, `pageshow`, visibility return, focus, reconnect, and detected timer suspension, compare the running release against the manifest before allowing the resumed UI to remain interactive.
   - If the served revision is newer, freeze the old shell, clear only app-owned stale caches, and perform one guarded replacement navigation while preserving the route and authentication session.
   - Keep the monotonic release floor so a lagging production target can never downgrade a newer running UI.

3. **Remove competing reload paths**
   - Make the version-mismatch banner a presentation-only subscriber to the controller rather than a second poller/reloader.
   - Route stale chunk recovery, manual hard reload, BFCache recovery, and automatic release replacement through the same reload arbiter and release-specific loop guard.
   - Keep the service-worker kill switch solely for removing legacy registrations; do not use it as the normal update mechanism.

4. **Make resumed state release-safe**
   - Retain the user’s stable light/dark preference and authentication data.
   - Validate persisted module/tab state against the current UI schema and discard only obsolete navigation aliases or incompatible presentation state after a release change.
   - Revalidate auth, tenant context, route guards, and current data after a successful resume/reload so an old role-specific shell cannot remain mounted.

5. **Make failures diagnosable**
   - Record environment, running revision, served revision, release floor, resume trigger, BFCache status, manifest response, and reload decision without tokens or sensitive data.
   - Show the latest decision in Platform Diagnostics and the build indicator, including an explicit warning if any deployed release identity is `dev` or unverifiable.
   - Preserve the existing release-floor telemetry while consolidating duplicate client events.

6. **Prove the inactivity scenarios**
   - Add tests for a preview tab missing hot updates while suspended, production resume onto a newer release, BFCache restore, offline-to-online recovery, lagging-target downgrade prevention, malformed/missing manifest, and reload-loop prevention.
   - Add browser automation that opens a module, advances the served revision while the page is inactive, resumes it, and verifies the old DOM is replaced while route, theme, and session are retained.
   - Run the stale-cache suite, TypeScript validation, and the AWS production build; verify generated metadata agrees across manifest, HTML, and bundle and contains a non-`dev` release ID.

## Technical scope
Frontend release lifecycle, Vite/build metadata, Docker/AWS deployment inputs, nginx manifest headers, diagnostics, and targeted tests. No database migration and no business-data changes.