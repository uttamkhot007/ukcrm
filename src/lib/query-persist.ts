import { QueryClient } from "@tanstack/react-query";

/**
 * Persistent query cache.
 *
 * Modules re-fetch the same tenant-scoped reference data every time they mount
 * (users, offerings, catalogs, dashboards). Persisting the React Query cache
 * means a module reopened — or the whole tab reloaded — paints with the last
 * known data immediately and revalidates in the background, instead of showing
 * a spinner while the round-trip completes.
 *
 * Implemented directly on localStorage so the app takes no extra dependency.
 */

const STORAGE_KEY = "nexus-query-cache-v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // a day: stale data still beats a spinner
const WRITE_DEBOUNCE_MS = 1000;
const MAX_BYTES = 3_000_000; // stay well under the ~5MB localStorage budget

type PersistedEntry = {
  queryKey: unknown;
  queryHash: string;
  state: unknown;
};

type PersistedCache = {
  version: string;
  savedAt: number;
  tenantId: string | null;
  queries: PersistedEntry[];
};

/** Queries that must never be written to disk. */
function isPersistable(queryHash: string): boolean {
  const hash = queryHash.toLowerCase();
  return !(
    hash.includes("session") ||
    hash.includes("token") ||
    hash.includes("secret") ||
    hash.includes("password") ||
    hash.includes("credential")
  );
}

export function createPersistentQueryClient(buildId: string): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh long enough that switching modules back and forth
        // does not re-hit the database on every click.
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Serve cached data instantly, revalidate underneath.
        refetchOnMount: "always",
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: { retry: 0 },
    },
  });

  if (typeof window === "undefined") return client;

  restore(client, buildId);
  scheduleWrites(client, buildId);
  return client;
}

function restore(client: QueryClient, buildId: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedCache;

    // A new build may change query shapes; a stale cache is worse than none.
    if (parsed.version !== buildId || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const cache = client.getQueryCache();
    for (const entry of parsed.queries) {
      cache.build(client, { queryKey: entry.queryKey as never, queryHash: entry.queryHash }, entry.state as never);
    }
  } catch {
    // A corrupt cache should never block boot.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

function scheduleWrites(client: QueryClient, buildId: string) {
  let timer: number | undefined;

  const write = () => {
    try {
      const queries = client
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.status === "success" && isPersistable(q.queryHash))
        .map((q) => ({ queryKey: q.queryKey, queryHash: q.queryHash, state: q.state }));

      const payload: PersistedCache = {
        version: buildId,
        savedAt: Date.now(),
        tenantId: null,
        queries,
      };

      let serialized = JSON.stringify(payload);
      // Drop the largest entries first if we blow the budget.
      while (serialized.length > MAX_BYTES && payload.queries.length > 0) {
        payload.queries.sort(
          (a, b) => JSON.stringify(b.state).length - JSON.stringify(a.state).length,
        );
        payload.queries.shift();
        serialized = JSON.stringify(payload);
      }

      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Quota exceeded or private mode — persistence is an optimisation only.
    }
  };

  const debounced = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(write, WRITE_DEBOUNCE_MS);
  };

  client.getQueryCache().subscribe(debounced);
  window.addEventListener("pagehide", write);
}

/**
 * Clear persisted data on sign-out or tenant switch so one tenant's data can
 * never paint inside another tenant's session.
 */
export function clearPersistedQueryCache() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
