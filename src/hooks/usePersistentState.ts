import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Module UI state that survives a browser reload.
 *
 * Tab selections, filters, search terms, sort order and view toggles are all
 * ephemeral React state today, so a refresh (or a redeploy) dumps the user back
 * at a module's default view. This hook mirrors that state into localStorage
 * and rehydrates it on mount, so people return exactly where they left off.
 *
 * Rules that keep it safe:
 *  - Keys are namespaced per tenant/user via `scope`, so one account's saved
 *    filters can never paint inside another's session.
 *  - Values expire after `ttlMs` (default 30 days) — a filter from months ago
 *    is more confusing than a clean default.
 *  - `validate` lets callers reject shapes they no longer understand after a
 *    refactor, falling back to the default instead of crashing.
 *  - Writes are wrapped: private mode / quota errors are never fatal.
 */

const PREFIX = "nexus-ui-state:";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type Stored<T> = { v: T; at: number };

function storageKey(key: string, scope?: string | null) {
  return `${PREFIX}${scope ?? "global"}:${key}`;
}

function read<T>(
  key: string,
  scope: string | null | undefined,
  ttlMs: number,
  validate?: (value: unknown) => value is T,
): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(key, scope));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Stored<T>;
    if (!parsed || typeof parsed.at !== "number") return undefined;
    if (Date.now() - parsed.at > ttlMs) {
      window.localStorage.removeItem(storageKey(key, scope));
      return undefined;
    }
    if (validate && !validate(parsed.v)) return undefined;
    return parsed.v;
  } catch {
    return undefined;
  }
}

export interface PersistentStateOptions<T> {
  /** Namespace, typically the tenant or user id, keeping states separated. */
  scope?: string | null;
  /** How long a stored value stays valid. Defaults to 30 days. */
  ttlMs?: number;
  /** Guard against shapes left over from an older version of the UI. */
  validate?: (value: unknown) => value is T;
}

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  { scope, ttlMs = DEFAULT_TTL_MS, validate }: PersistentStateOptions<T> = {},
) {
  const [value, setValue] = useState<T>(
    () => read<T>(key, scope, ttlMs, validate) ?? defaultValue,
  );

  // Re-read when the scope changes (tenant switch) so we never carry state over.
  const scopeRef = useRef(scope);
  useEffect(() => {
    if (scopeRef.current === scope) return;
    scopeRef.current = scope;
    setValue(read<T>(key, scope, ttlMs, validate) ?? defaultValue);
    // defaultValue/validate are intentionally not deps: they are usually inline
    // literals and would re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, key, ttlMs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey(key, scope),
        JSON.stringify({ v: value, at: Date.now() } satisfies Stored<T>),
      );
    } catch {
      // Persistence is an optimisation; quota or private mode must not break UI.
    }
  }, [key, scope, value]);

  const reset = useCallback(() => {
    setValue(defaultValue);
    try {
      window.localStorage.removeItem(storageKey(key, scope));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scope]);

  return [value, setValue, reset] as const;
}

/**
 * Convenience wrapper for filter objects: merges the persisted partial over the
 * defaults so newly added filter fields still get a sane value.
 */
export function usePersistentFilters<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
  options: PersistentStateOptions<Partial<T>> = {},
) {
  const [stored, setStored, reset] = usePersistentState<Partial<T>>(
    key,
    {},
    options,
  );

  const filters = { ...defaults, ...stored } as T;

  const setFilters = useCallback(
    (patch: Partial<T>) => setStored((prev) => ({ ...prev, ...patch })),
    [setStored],
  );

  return { filters, setFilters, resetFilters: reset };
}

/** Drop every persisted UI state — used on sign-out. */
export function clearPersistedUiState(scope?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const prefix = scope ? `${PREFIX}${scope}:` : PREFIX;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
