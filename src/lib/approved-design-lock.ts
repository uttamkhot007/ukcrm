/* ------------------------------------------------------------------ *
 * Approved design lock
 *
 * The Platform Console shell shown in the approved screenshot (global tab
 * bar: Overview / Tenants / User Management / License Management /
 * Integrations, live-site status strip, Platform Console banner, module tab
 * strip) is the ONLY design this app is allowed to paint.
 *
 * Any bundle that boots with a design revision older than the approved one
 * is a stale shell handed over by an HTTP cache, bfcache, proxy or a lagging
 * deploy. We refuse to render it: caches are purged and the page reloads
 * until an approved (or newer, intentionally bumped) design is served.
 *
 * Bumping the design: raise APPROVED_DESIGN_REVISION *and* update
 * APPROVED_DESIGN_ID in the same commit. Never lower it.
 * ------------------------------------------------------------------ */

import { BUILD_COMMIT } from "@/lib/build-info";

/** Monotonic revision of the approved UI shell. Only ever increases. */
export const APPROVED_DESIGN_REVISION = 1;

/** Human-readable identity of the approved design. */
export const APPROVED_DESIGN_ID = "platform-console-2026-08-17";

const STORAGE_KEY = "nexus:approved-design";

type StoredDesign = { revision: number; id: string; at: string };

function safeLocal(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readStoredDesign(): StoredDesign | null {
  try {
    const raw = safeLocal()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDesign>;
    return typeof parsed.revision === "number" && Number.isFinite(parsed.revision)
      ? { revision: parsed.revision, id: String(parsed.id ?? ""), at: String(parsed.at ?? "") }
      : null;
  } catch {
    return null;
  }
}

function writeStoredDesign(design: StoredDesign): void {
  try {
    safeLocal()?.setItem(STORAGE_KEY, JSON.stringify(design));
  } catch {
    /* ignore */
  }
}

/** Highest design revision this browser has ever been served. */
export function getApprovedDesignFloor(): number {
  return readStoredDesign()?.revision ?? 0;
}

/** True when the running bundle paints a design older than the approved one. */
export function isRunningDesignStale(): boolean {
  if (BUILD_COMMIT === "dev") return false;
  return APPROVED_DESIGN_REVISION < getApprovedDesignFloor();
}

/** Record the running design as the new floor when it is at/above the floor. */
export function recordApprovedDesign(): void {
  if (APPROVED_DESIGN_REVISION <= getApprovedDesignFloor()) return;
  writeStoredDesign({
    revision: APPROVED_DESIGN_REVISION,
    id: APPROVED_DESIGN_ID,
    at: new Date().toISOString(),
  });
}

/**
 * Boot guard. Returns `true` when the bundle was rejected and a recovery
 * reload was started — callers must not mount React in that case.
 */
export function enforceApprovedDesign(): boolean {
  if (typeof window === "undefined") return false;

  if (!isRunningDesignStale()) {
    recordApprovedDesign();
    return false;
  }

  // eslint-disable-next-line no-console
  console.warn(
    `[design-lock] blocked unapproved shell (revision ${APPROVED_DESIGN_REVISION} < approved ${getApprovedDesignFloor()}) — purging caches`,
  );

  void import("@/lib/cache-cleanup")
    .then((module) => module.forceFreshReload())
    .catch(() => window.location.reload());

  return true;
}
