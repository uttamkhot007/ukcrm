// Detects rapid redirect loops (e.g. "/" → "/admin/platform/tenants" firing
// repeatedly) and lets callers force a cache cleanup + hard reload.
//
// State is kept in sessionStorage so it survives full-page reloads — without
// that, the recovery itself could loop.

const KEY = "redirect-loop:history";
const WINDOW_MS = 10_000;
const THRESHOLD = 3; // 3 identical redirects within WINDOW_MS triggers cleanup
const MAX_ENTRIES = 20;

export interface RedirectEntry {
  from: string;
  to: string;
  t: number;
}

function read(): RedirectEntry[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RedirectEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: RedirectEntry[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore quota errors
  }
}

function prune(entries: RedirectEntry[]): RedirectEntry[] {
  const cutoff = Date.now() - WINDOW_MS;
  return entries.filter((e) => e.t >= cutoff);
}

export function recordRedirect(from: string, to: string): void {
  const entries = prune(read());
  entries.push({ from, to, t: Date.now() });
  write(entries);
}

export function shouldForceCleanup(from?: string, to?: string): boolean {
  const entries = prune(read());
  if (from && to) {
    const matching = entries.filter((e) => e.from === from && e.to === to);
    return matching.length >= THRESHOLD;
  }
  // No pair specified: check the most-frequent pair
  const counts = new Map<string, number>();
  for (const e of entries) {
    const k = `${e.from}→${e.to}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const c of counts.values()) {
    if (c >= THRESHOLD) return true;
  }
  return false;
}

export function getRecentRedirects(limit = 5): RedirectEntry[] {
  return prune(read()).slice(-limit).reverse();
}

export function clearRedirectHistory(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
