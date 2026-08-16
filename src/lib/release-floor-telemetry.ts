/**
 * Release-floor telemetry.
 *
 * Every time the release floor stops a browser from running (or accepting) a
 * bundle older than one it has already seen, we want a durable record of it:
 * which release was blocked, which release was the floor, which release the
 * server offered, what triggered the check, and which browser session (and
 * user, when signed in) it happened to.
 *
 * Three sinks, in increasing durability:
 *   1. console — an immediate, structured `console.warn` for live debugging.
 *   2. localStorage ring buffer — survives the forced reload that follows a
 *      block, so the event is still visible after the page comes back.
 *   3. `release_floor_blocks` table — durable, platform-wide, read by the
 *      Platform Console. Writes are queued and retried, because the very next
 *      thing that happens after a block is usually a hard reload.
 *
 * No tokens, no payloads — only release identities plus a random session id.
 */

import { BUILD_TIME, RELEASE_ID } from "@/lib/build-info";

export type ReleaseFloorEventKind =
  | "boot_blocked" // running bundle was below the floor at boot
  | "served_blocked" // the server handed us a bundle below the floor
  | "downgrade_prevented" // an older served release was refused, tab preserved
  | "floor_raised"; // a newer release identity was observed

export type ReleaseFloorEvent = {
  id: string;
  occurredAt: string;
  sessionId: string;
  eventKind: ReleaseFloorEventKind;
  trigger: string | null;
  runningReleaseId: string;
  runningBuildTime: string | null;
  floorReleaseId: string | null;
  floorBuildTime: string | null;
  servedReleaseId: string | null;
  reason: string | null;
  action: string | null;
  pageUrl: string | null;
};

const SESSION_KEY = "nexus:telemetry-session";
const LOG_KEY = "nexus:release-floor-log";
const QUEUE_KEY = "nexus:release-floor-queue";
const MAX_LOG = 50;
const MAX_QUEUE = 25;
export const RELEASE_FLOOR_EVENT = "nexus:release-floor-event";

function safeLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Stable per-browser-session id. Kept in localStorage (not sessionStorage) so
 * the forced reload after a block still correlates to the same session.
 */
export function getTelemetrySessionId(): string {
  const store = safeLocal();
  const existing = store?.getItem(SESSION_KEY);
  if (existing && existing.length >= 8) return existing;
  const created = `sess-${randomId()}`;
  try {
    store?.setItem(SESSION_KEY, created);
  } catch {
    /* ignore */
  }
  return created;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = safeLocal()?.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    safeLocal()?.setItem(key, JSON.stringify(value));
  } catch {
    /* telemetry must never break the app */
  }
}

/** Locally persisted event log (newest first). */
export function getReleaseFloorLog(): ReleaseFloorEvent[] {
  return readJson<ReleaseFloorEvent[]>(LOG_KEY, []).slice().reverse();
}

export function clearReleaseFloorLog(): void {
  writeJson(LOG_KEY, []);
  try {
    window.dispatchEvent(new CustomEvent(RELEASE_FLOOR_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeReleaseFloorEvents(fn: () => void): () => void {
  window.addEventListener(RELEASE_FLOOR_EVENT, fn);
  return () => window.removeEventListener(RELEASE_FLOOR_EVENT, fn);
}

function enqueue(event: ReleaseFloorEvent): void {
  const queue = readJson<ReleaseFloorEvent[]>(QUEUE_KEY, []);
  queue.push(event);
  writeJson(QUEUE_KEY, queue.slice(-MAX_QUEUE));
}

let flushing = false;

/**
 * Ship queued events to the database. Runs on a fresh boot too, which is how
 * an event recorded microseconds before a forced reload still lands.
 */
export async function flushReleaseFloorTelemetry(): Promise<void> {
  if (typeof window === "undefined" || flushing) return;
  const queue = readJson<ReleaseFloorEvent[]>(QUEUE_KEY, []);
  if (queue.length === 0) return;
  flushing = true;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;

    const rows = queue.map((event) => ({
      occurred_at: event.occurredAt,
      session_id: event.sessionId,
      user_id: userId,
      event_kind: event.eventKind,
      trigger: event.trigger,
      running_release_id: event.runningReleaseId.slice(0, 256),
      running_build_time: Number.isFinite(Date.parse(event.runningBuildTime ?? ""))
        ? event.runningBuildTime
        : null,
      floor_release_id: event.floorReleaseId,
      floor_build_time: Number.isFinite(Date.parse(event.floorBuildTime ?? ""))
        ? event.floorBuildTime
        : null,
      served_release_id: event.servedReleaseId,
      reason: event.reason,
      action: event.action,
      page_url: event.pageUrl,
      user_agent: navigator.userAgent.slice(0, 400),
    }));

    const { error } = await supabase.from("release_floor_blocks").insert(rows);
    if (!error) {
      // Only drop what we actually shipped; events queued meanwhile survive.
      const remaining = readJson<ReleaseFloorEvent[]>(QUEUE_KEY, []).filter(
        (item) => !queue.some((sent) => sent.id === item.id),
      );
      writeJson(QUEUE_KEY, remaining);
    }
  } catch {
    /* offline or unauthenticated — the queue is retried on the next boot */
  } finally {
    flushing = false;
  }
}

export type ReleaseFloorReport = {
  eventKind: ReleaseFloorEventKind;
  trigger?: string | null;
  floorReleaseId?: string | null;
  floorBuildTime?: string | null;
  servedReleaseId?: string | null;
  reason?: string | null;
  action?: string | null;
};

/** Record one release-floor decision across all three sinks. */
export function recordReleaseFloorEvent(report: ReleaseFloorReport): ReleaseFloorEvent | null {
  if (typeof window === "undefined") return null;

  const event: ReleaseFloorEvent = {
    id: randomId(),
    occurredAt: new Date().toISOString(),
    sessionId: getTelemetrySessionId(),
    eventKind: report.eventKind,
    trigger: report.trigger ?? null,
    runningReleaseId: RELEASE_ID,
    runningBuildTime: BUILD_TIME,
    floorReleaseId: report.floorReleaseId ?? null,
    floorBuildTime: report.floorBuildTime ?? null,
    servedReleaseId: report.servedReleaseId ?? null,
    reason: report.reason ?? null,
    action: report.action ?? null,
    pageUrl: `${window.location.pathname}${window.location.search}`,
  };

  const log = readJson<ReleaseFloorEvent[]>(LOG_KEY, []);
  log.push(event);
  writeJson(LOG_KEY, log.slice(-MAX_LOG));
  enqueue(event);

  const line = `[release-floor] ${event.eventKind}${event.trigger ? ` (${event.trigger})` : ""}`;
  if (event.eventKind === "floor_raised") {
    console.info(line, event);
  } else {
    console.warn(line, event);
  }

  try {
    window.dispatchEvent(new CustomEvent(RELEASE_FLOOR_EVENT, { detail: event }));
  } catch {
    /* ignore */
  }

  // Best effort immediate ship; a pending reload is covered by the queue.
  void flushReleaseFloorTelemetry();
  return event;
}
