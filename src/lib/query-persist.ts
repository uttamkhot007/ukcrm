import { QueryClient } from "@tanstack/react-query";
import { recordQueryRead } from "@/lib/cache-metrics";
import { UI_STATE_SCHEMA_VERSION } from "@/lib/ui-persistence";

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
  schema?: string;
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
        // Serve cached data instantly and only revalidate once it is stale, so
        // hopping between sub-modules re-uses the cache instead of refetching.
        refetchOnMount: true,

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
  instrumentCacheHits(client);
  return client;
}

function restore(client: QueryClient, buildId: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedCache;

    // A new build may change query shapes; a stale cache is worse than none.
    if (
      parsed.version !== buildId ||
      parsed.schema !== UI_STATE_SCHEMA_VERSION ||
      Date.now() - parsed.savedAt > MAX_AGE_MS
    ) {
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

/**
 * Classify every query read as a cache hit or miss.
 *
 * When a component mounts and subscribes to a query, one of three things
 * happens: the cache has fresh data (instant paint, no network), it has stale
 * data (instant paint + background revalidation), or it has nothing (spinner).
 * That ratio is the single best measure of whether the persisted cache is
 * actually delivering instant tab switching, so it is counted here — centrally,
 * for every query in the app, with no per-call instrumentation.
 */
function instrumentCacheHits(client: QueryClient) {
  client.getQueryCache().subscribe((event) => {
    if (event.type !== "observerAdded") return;
    const query = event.query;
    const scope = String((query.queryKey as unknown[])[0] ?? "unknown");
    const updatedAt = query.state.dataUpdatedAt;
    const hasData = query.state.data !== undefined && updatedAt > 0;
    if (!hasData) {
      recordQueryRead(scope, "miss", 0);
      return;
    }
    const age = Date.now() - updatedAt;
    recordQueryRead(scope, query.isStale() ? "stale" : "fresh", age);
  });
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
        schema: UI_STATE_SCHEMA_VERSION,
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
