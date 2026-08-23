/**
 * Build-safe identity for the only approved application shell.
 *
 * This module deliberately has no browser dependencies so Vite can stamp the
 * same identity into HTML, the release manifest, and the JavaScript bundle.
 */
export const APPROVED_DESIGN_REVISION = 4;
export const APPROVED_DESIGN_ID = "platform-console-2026-08-23-r4";