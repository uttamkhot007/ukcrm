/**
 * Route + deployment diagnostics.
 *
 * Answers the question "why am I looking at an old / unexpected view?" by
 * recording three independent signals:
 *
 *   1. Route history      — every location the router actually rendered.
 *   2. Redirect decisions — every guard that chose to navigate (or chose NOT
 *      to), with the reason and the inputs it used.
 *   3. Deployment identity — the build compiled into this JS bundle vs. the
 *      build of the HTML document currently served by the origin.
 *
 * If (3) disagrees, the browser is running a stale shell or a stale bundle,
 * which is the usual cause of "my change vanished".
 */

import { BUILD_COMMIT, BUILD_TIME, BUILD_VERSION } from "@/lib/build-info";

export type DiagnosticKind = "route" | "redirect" | "blocked" | "info";

export interface DiagnosticEntry {
  id: string;
  kind: DiagnosticKind;
  t: number;
  /** Where the decision was made, e.g. "Index", "AdminLayout". */
  source: string;
  from: string;
  to?: string;
  reason: string;
  /** Guard inputs (auth resolved, role, module requested, …). */
  details?: Record<string, unknown>;
}

const KEY = "nexus:route-diagnostics";
const MAX_ENTRIES = 60;
const EVENT = "nexus:route-diagnostics-updated";

let memory: DiagnosticEntry[] = [];
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DiagnosticEntry[];
      if (Array.isArray(parsed)) memory = parsed;
    }
  } catch {
    memory = [];
  }
}

function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(memory.slice(-MAX_ENTRIES)));
  } catch {
    /* quota — in-memory copy still works */
  }
}

function push(entry: Omit<DiagnosticEntry, "id" | "t">) {
  hydrate();
  memory = [
    ...memory,
    { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, t: Date.now() },
  ].slice(-MAX_ENTRIES);
  persist();
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* SSR / non-browser */
  }
}

/** Record that the router rendered a location. */
export function logRoute(path: string, details?: Record<string, unknown>) {
  push({ kind: "route", source: "router", from: path, reason: "rendered", details });
}

/** Record a guard that navigated the user somewhere else. */
export function logRedirect(
  source: string,
  from: string,
  to: string,
  reason: string,
  details?: Record<string, unknown>,
) {
  push({ kind: "redirect", source, from, to, reason, details });
}

/** Record a guard that deliberately did NOT redirect (equally diagnostic). */
export function logNoRedirect(
  source: string,
  from: string,
  reason: string,
  details?: Record<string, unknown>,
) {
  push({ kind: "blocked", source, from, reason, details });
}

export function getDiagnostics(limit = MAX_ENTRIES): DiagnosticEntry[] {
  hydrate();
  return memory.slice(-limit).reverse();
}

export function clearDiagnostics() {
  memory = [];
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeDiagnostics(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

// ---------------------------------------------------------------------------
// Deployment identity
// ---------------------------------------------------------------------------

export interface DeploymentIdentity {
  /** Build compiled into the running JavaScript bundle. */
  bundle: { version: string; buildTime: string; commit: string; id: string };
  /** Build of the HTML document that the origin is serving right now. */
  served: {
    buildTime: string | null;
    commit: string | null;
    id: string | null;
    etag: string | null;
    /** HTML currently in the DOM (may be older than what the origin serves). */
    documentBuildTime: string | null;
  };
  /** True when the served HTML and the running bundle disagree. */
  mismatch: boolean;
  origin: string;
  checkedAt: string;
  error?: string;
}

function shortCommit(commit: string | null | undefined) {
  if (!commit || commit === "dev") return commit ?? null;
  return commit.slice(0, 12);
}

function deploymentId(buildTime: string | null, commit: string | null) {
  if (!buildTime && !commit) return null;
  const stamp = buildTime ? buildTime.replace(/[-:.TZ]/g, "").slice(0, 14) : "unknown";
  return `${stamp}-${shortCommit(commit) ?? "nocommit"}`;
}

function metaContent(doc: Document | null, name: string): string | null {
  const el = doc?.querySelector(`meta[name="${name}"]`);
  const value = el?.getAttribute("content") ?? null;
  if (!value || value.startsWith("__INDEX_HTML")) return null;
  return value;
}

/**
 * Fetch the origin's current index.html (bypassing cache) and compare its
 * build identity with the bundle running in this tab.
 */
export async function resolveDeploymentIdentity(): Promise<DeploymentIdentity> {
  const bundle = {
    version: BUILD_VERSION,
    buildTime: BUILD_TIME,
    commit: BUILD_COMMIT,
    id: deploymentId(BUILD_TIME, BUILD_COMMIT) ?? "unknown",
  };
  const origin = typeof window !== "undefined" ? window.location.origin : "n/a";
  const documentBuildTime = metaContent(
    typeof document !== "undefined" ? document : null,
    "build-time",
  );

  const base: DeploymentIdentity = {
    bundle,
    served: {
      buildTime: null,
      commit: null,
      id: null,
      etag: null,
      documentBuildTime,
    },
    mismatch: false,
    origin,
    checkedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${origin}/index.html`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const html = await res.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const servedBuildTime = metaContent(parsed, "build-time");
    const servedCommit = metaContent(parsed, "build-commit");

    return {
      ...base,
      served: {
        buildTime: servedBuildTime,
        commit: servedCommit,
        id: deploymentId(servedBuildTime, servedCommit),
        etag: res.headers.get("etag"),
        documentBuildTime,
      },
      mismatch: Boolean(
        (servedCommit && bundle.commit !== "dev" && servedCommit !== bundle.commit) ||
        (servedBuildTime && bundle.buildTime && servedBuildTime !== bundle.buildTime),
      ),
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "fetch failed" };
  }
}
