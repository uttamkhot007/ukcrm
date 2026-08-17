# Permanent old-view prevention

## Confirmed problem
- The current preview code has a release manifest and correctly identifies the running preview release when the manifest responds.
- In the supplied browser session, both startup requests to `release-manifest.json` failed. The controller currently records that failure and then allows the existing React view to continue, so a tab restored after inactivity can remain on an unverifiable old UI.
- The currently published Lovable URL returns `404` for `release-manifest.json`, which means that deployment cannot participate in release-coherence checks yet. The AWS build path includes the manifest and immutable commit-addressed images, but deployment verification does not probe the manifest contents from every user-facing URL.
- Resume listeners already cover visibility, focus, online, and BFCache. The remaining gap is failure handling: a failed manifest request is treated as harmless rather than a coherence failure requiring fallback verification or a protected read-only state.

## Implementation
1. **Make release verification resilient**
   - Add one authoritative release resolver that first requests the no-store release manifest, then falls back to a no-store `index.html` metadata probe when the manifest is missing, blocked, or transiently unavailable.
   - Use bounded retries with request timeouts and deduplicate concurrent boot/focus/visibility checks so one recovery decision is made per resume event.
   - Compare deterministic release ID, commit, build time, preview revision, and UI schema version; never infer freshness from cached application state.

2. **Do not silently accept an unverifiable resumed UI**
   - Before initial React mount, wait for a verified release result while online. If a newer release is found, replace the page before the old tree can paint.
   - When an inactive/BFCache-restored tab resumes, temporarily place the shell in a non-interactive checking state until verification succeeds.
   - If both verification paths fail, show a persistent “version could not be verified” recovery banner, disable writes/risky actions, retry on reconnect/focus, and provide one cache-clearing reload action. Offline users may inspect the current view read-only, but it will not be represented as current.

3. **Use one recovery controller**
   - Route boot checks, focus/visibility resume, BFCache, reconnect, stale lazy chunks, and manual reload through the same request arbiter.
   - Preserve the current route, auth session, tenant, and theme while clearing only app-owned caches and incompatible UI persistence.
   - Keep the monotonic release floor and downgrade protection; remove stale diagnostics wording that still refers to an `index` fetch when the manifest fails.

4. **Close deployment gaps**
   - Verify that each production artifact contains matching release identity in the manifest, HTML, and JavaScript bundle.
   - After deployment, probe `release-manifest.json` from every user-facing target and fail the rollout if it is missing, returns `dev`, disagrees with the expected commit, or is cacheable.
   - Ensure the currently published Lovable frontend is updated so it serves the generated manifest; frontend code changes require an Update in the publish flow, while AWS continues using immutable commit-tagged images.

5. **Add permanent regression coverage**
   - Test manifest failure with successful HTML fallback, manifest `404`, two transient network failures, complete online verification failure, offline resume, BFCache restore, suspended preview missing an HMR revision, newer production release, and lagging-target downgrade prevention.
   - Add browser automation that suspends a tab, advances the served release, resumes it, and proves the old DOM becomes non-interactive and is replaced while route, theme, tenant, and session remain intact.
   - Surface the latest verification source, attempts, running/served release IDs, trigger, and decision in Platform Diagnostics without tokens or sensitive data.

## Technical scope
Frontend release lifecycle, cache/reload utilities, version banner/guard state, release diagnostics, Vite manifest handling, AWS deployment verification, and targeted automated tests. No database or business-data changes.
