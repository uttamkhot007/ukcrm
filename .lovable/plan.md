# Permanent stale-window recovery

## Goal
Ensure that returning to NexusCRM after tab or browser inactivity can never continue showing an obsolete application shell. Current data and the visual application release must remain synchronized.

## Confirmed findings
- Production assets already use content-hashed filenames and nginx marks the HTML shell as `no-store`, so ordinary HTTP caching is configured correctly.
- AWS deployments already use commit-addressed container images and verify that all running frontend tasks use the expected image.
- The running app checks for a newer same-origin build on a timer and on `visibilitychange`, but it does not handle browser back/forward-cache restoration (`pageshow`) or a tab resumed from suspension with an old in-memory React tree.
- Persisted UI preferences are not release-versioned. Module selections survive for 30 days and the theme is loaded from an unversioned key without schema validation, allowing obsolete presentation state to be restored after UI changes.
- Build cache cleanup only removes query/build-scoped keys; it leaves old `nexus-ui-state:*` and theme state intact.

## Implementation
1. **Create one release-coherence controller**
   - Consolidate build polling, resume detection, and cache migration into one boot-time lifecycle.
   - On `pageshow` (including BFCache restore), `visibilitychange`, `focus`, `online`, and browser resume, fetch same-origin `index.html` with `no-store` and compare both commit and build time.
   - If the served release differs, perform one guarded replacement reload for that release; prevent loops with a release-specific session marker.

2. **Version all presentation persistence**
   - Add a UI schema/release version to persisted theme and module UI state.
   - Validate stored theme values and fall back to the current cyber/premium defaults when old or malformed state is found.
   - Migrate or discard obsolete module/tab aliases so removed layouts cannot be reconstructed from old local state.
   - Keep tenant/user scoping and avoid clearing authentication data.

3. **Harden cache cleanup boundaries**
   - Purge only obsolete app-owned presentation/query keys when the release or UI schema changes.
   - Keep current content-hashed assets immutable, and retain the existing service-worker removal path solely for legacy cleanup.
   - Remove overlapping reload responsibilities so only the coherence controller may auto-reload.

4. **Add release diagnostics**
   - Record running release, served release, resume reason, BFCache status, and reload decision without tokens or user data.
   - Surface this in the existing Platform Diagnostics/build indicator so an “old look” report can be tied to exact release evidence.

5. **Validate the inactivity scenarios**
   - Add unit tests for newer release detection, BFCache restore, stale persisted UI migration, malformed theme recovery, and reload-loop prevention.
   - Use browser automation to test background/foreground, `pageshow.persisted`, offline-to-online, and a simulated deployment while the tab is inactive.
   - Run TypeScript checks and the AWS production build, confirming immutable assets and a clean production bundle.

## Technical scope
Frontend cache/build lifecycle, persisted presentation state, existing diagnostics, and targeted tests only. No database changes and no changes to business data persistence.
