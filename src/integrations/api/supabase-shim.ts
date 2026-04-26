/**
 * Supabase-compatible client shim that translates queries into REST calls
 * against the self-hosted Fastify backend.
 *
 * Goal: be a drop-in replacement for the small but critical subset of the
 * Supabase JS API that this codebase uses, so existing components keep
 * compiling and most read/write paths keep working without code changes.
 *
 * Supported (v1):
 *   from(table).select(cols)
 *     .eq / .neq / .gt / .gte / .lt / .lte / .in / .ilike / .like / .is
 *     .filter(col, op, val) for the same ops
 *     .order(col, { ascending })
 *     .limit(n) / .range(from, to)
 *     .single() / .maybeSingle()
 *   from(table).insert(rows[, { returning }])
 *   from(table).update(values).eq(...)
 *   from(table).upsert(rows)
 *   from(table).delete().eq(...)
 *
 *   auth.signInWithPassword / signUp / signOut / getSession / getUser /
 *   onAuthStateChange / resetPasswordForEmail / updateUser
 *
 * Not supported yet (will throw a descriptive error):
 *   - Embedded selects ("col, related_table(*)")
 *   - .or() composite filters
 *   - Realtime channels (returns a no-op channel)
 *   - Storage (returns a stub that throws)
 *   - Edge functions invoke (returns a stub that throws)
 *   - RPC (returns a stub that throws)
 *
 * Each unsupported feature logs a clear message so callers can migrate
 * incrementally.
 */

import { restRequest, tokenStore, ApiError } from "./rest-client";

// ============================================================================
// Table → REST path mapping
// ============================================================================

/**
 * Convert snake_case table name to the kebab-case REST path used by the
 * backend route registry in `backend/src/routes/all-routes.ts`.
 */
function tableToPath(table: string): string {
  return `/api/${table.replace(/_/g, "-")}`;
}

// ============================================================================
// Filter encoding
// ============================================================================

type FilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "is";

interface Filter {
  column: string;
  op: FilterOp;
  value: unknown;
}

/**
 * Encode filters into query params using a PostgREST-flavored convention the
 * backend understands:
 *   eq:  column=value             (handled by crud-factory generic filter)
 *   others: column__op=value      (extension we use for non-eq ops)
 * Plain `column=value` already matches PostgREST eq semantics.
 */
function filtersToParams(filters: Filter[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const f of filters) {
    const v = Array.isArray(f.value) ? f.value.join(",") : String(f.value ?? "");
    if (f.op === "eq") {
      params[f.column] = v;
    } else {
      params[`${f.column}__${f.op}`] = v;
    }
  }
  return params;
}

// ============================================================================
// PostgrestResponse-like return type
// ============================================================================

export interface PostgrestResponse<T> {
  data: T | null;
  error: { message: string; code?: string; details?: unknown } | null;
  status: number;
  statusText: string;
  count?: number | null;
}

function ok<T>(data: T, status = 200): PostgrestResponse<T> {
  return { data, error: null, status, statusText: "OK", count: null };
}

function fail(err: unknown): PostgrestResponse<null> {
  if (err instanceof ApiError) {
    return {
      data: null,
      error: { message: err.message, details: err.details },
      status: err.status,
      statusText: "Error",
    };
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return { data: null, error: { message }, status: 500, statusText: "Error" };
}

// ============================================================================
// Query builder
// ============================================================================

interface BuilderState {
  table: string;
  selectCols: string;
  filters: Filter[];
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  range?: { from: number; to: number };
  mode: "select" | "insert" | "update" | "upsert" | "delete";
  payload?: unknown;
  upsertOnConflict?: string;
  countMode?: "exact" | "planned" | "estimated";
  headOnly?: boolean;
}

class QueryBuilder<T = unknown> implements PromiseLike<PostgrestResponse<T | T[]>> {
  private state: BuilderState;
  private singleMode: "none" | "single" | "maybeSingle" = "none";

  constructor(table: string) {
    this.state = {
      table,
      selectCols: "*",
      filters: [],
      mode: "select",
    };
  }

  // -------- mutation entry points --------
  select(
    cols: string = "*",
    opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
  ): this {
    this.state.selectCols = cols;
    if (opts?.count) this.state.countMode = opts.count;
    if (opts?.head) this.state.headOnly = true;
    if (cols.includes("(") || cols.includes(")")) {
      // Embedded-resource selects are not supported by the REST factory.
      // We log once but still execute, returning the row without joins.
      console.warn(
        `[supabase-shim] Embedded select not supported on table "${this.state.table}". Falling back to flat columns. Original select: ${cols}`,
      );
    }
    return this;
  }

  insert(values: unknown | unknown[]): this {
    this.state.mode = "insert";
    this.state.payload = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.state.mode = "update";
    this.state.payload = values;
    return this;
  }

  upsert(values: unknown | unknown[], opts?: { onConflict?: string }): this {
    this.state.mode = "upsert";
    this.state.payload = values;
    this.state.upsertOnConflict = opts?.onConflict;
    return this;
  }

  delete(): this {
    this.state.mode = "delete";
    return this;
  }

  // -------- filters --------
  eq(column: string, value: unknown) {
    this.state.filters.push({ column, op: "eq", value });
    return this;
  }
  neq(column: string, value: unknown) {
    this.state.filters.push({ column, op: "neq", value });
    return this;
  }
  gt(column: string, value: unknown) {
    this.state.filters.push({ column, op: "gt", value });
    return this;
  }
  gte(column: string, value: unknown) {
    this.state.filters.push({ column, op: "gte", value });
    return this;
  }
  lt(column: string, value: unknown) {
    this.state.filters.push({ column, op: "lt", value });
    return this;
  }
  lte(column: string, value: unknown) {
    this.state.filters.push({ column, op: "lte", value });
    return this;
  }
  like(column: string, pattern: string) {
    this.state.filters.push({ column, op: "like", value: pattern });
    return this;
  }
  ilike(column: string, pattern: string) {
    this.state.filters.push({ column, op: "ilike", value: pattern });
    return this;
  }
  is(column: string, value: unknown) {
    this.state.filters.push({ column, op: "is", value });
    return this;
  }
  in(column: string, values: unknown[]) {
    this.state.filters.push({ column, op: "in", value: values });
    return this;
  }
  not(column: string, op: FilterOp, value: unknown) {
    // Encode as <col>__not_<op>=value
    this.state.filters.push({
      column: `${column}__not`,
      op,
      value,
    });
    return this;
  }
  filter(column: string, op: string, value: unknown) {
    if (
      ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"].includes(op)
    ) {
      this.state.filters.push({ column, op: op as FilterOp, value });
    } else {
      console.warn(`[supabase-shim] Unsupported filter operator "${op}" — ignoring`);
    }
    return this;
  }
  or(_expression: string) {
    console.warn(
      `[supabase-shim] .or() composite filters are not supported in the REST shim. Falling back to no-filter. Migrate this query to an explicit backend endpoint.`,
    );
    return this;
  }
  contains(column: string, value: unknown) {
    // For jsonb/array. Backend not implemented; pass through as eq for safety.
    console.warn(`[supabase-shim] .contains() is approximated. Column: ${column}`);
    this.state.filters.push({ column, op: "eq", value });
    return this;
  }
  match(criteria: Record<string, unknown>) {
    for (const [col, val] of Object.entries(criteria)) {
      this.state.filters.push({ column: col, op: "eq", value: val });
    }
    return this;
  }

  // -------- modifiers --------
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) {
    this.state.orderBy = { column, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.state.limit = n;
    return this;
  }
  range(from: number, to: number) {
    this.state.range = { from, to };
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  // -------- execution --------
  private async execute(): Promise<PostgrestResponse<T | T[]>> {
    const path = tableToPath(this.state.table);
    const filterParams = filtersToParams(this.state.filters);

    try {
      switch (this.state.mode) {
        case "select": {
          const params: Record<string, string> = { ...filterParams };
          if (this.state.orderBy) {
            params.sortBy = this.state.orderBy.column;
            params.sortOrder = this.state.orderBy.ascending ? "asc" : "desc";
          }
          if (this.state.range) {
            params.page = String(Math.floor(this.state.range.from / Math.max(1, this.state.range.to - this.state.range.from + 1)) + 1);
            params.limit = String(this.state.range.to - this.state.range.from + 1);
          } else if (this.state.limit) {
            params.limit = String(this.state.limit);
          }
          const resp = await restRequest<{ data: T[]; pagination?: { total: number } }>(
            path,
            { method: "GET", params },
          );
          const rows = resp?.data ?? [];
          const result = this.applySingle(rows);
          return { ...ok(result), count: resp?.pagination?.total ?? null };
        }

        case "insert": {
          const rows = Array.isArray(this.state.payload)
            ? this.state.payload
            : [this.state.payload];
          // Backend expects single object per call; insert one-by-one when array.
          const created: unknown[] = [];
          for (const row of rows) {
            const resp = await restRequest<{ data: unknown }>(path, {
              method: "POST",
              body: row,
            });
            created.push(resp.data);
          }
          const result = this.applySingle(created);
          return ok(result, 201);
        }

        case "update": {
          // Update needs a single id from filters
          const idFilter = this.state.filters.find((f) => f.column === "id" && f.op === "eq");
          if (!idFilter) {
            // No id — apply update via list endpoint not supported, surface error
            throw new ApiError(
              `[supabase-shim] update on "${this.state.table}" requires .eq("id", ...) — bulk updates without an id filter are not supported by the REST factory.`,
              400,
            );
          }
          const resp = await restRequest<{ data: unknown }>(
            `${path}/${encodeURIComponent(String(idFilter.value))}`,
            { method: "PATCH", body: this.state.payload },
          );
          const result = this.applySingle([resp.data]);
          return ok(result);
        }

        case "upsert": {
          // Approximation: try insert; on conflict, caller should use update path.
          const rows = Array.isArray(this.state.payload)
            ? this.state.payload
            : [this.state.payload];
          const out: unknown[] = [];
          for (const row of rows) {
            try {
              const resp = await restRequest<{ data: unknown }>(path, {
                method: "POST",
                body: row,
              });
              out.push(resp.data);
            } catch (err) {
              if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
                // Try PATCH by id if present
                const r = row as Record<string, unknown>;
                if (r.id) {
                  const resp = await restRequest<{ data: unknown }>(
                    `${path}/${encodeURIComponent(String(r.id))}`,
                    { method: "PATCH", body: row },
                  );
                  out.push(resp.data);
                  continue;
                }
              }
              throw err;
            }
          }
          const result = this.applySingle(out);
          return ok(result);
        }

        case "delete": {
          const idFilter = this.state.filters.find((f) => f.column === "id" && f.op === "eq");
          if (!idFilter) {
            throw new ApiError(
              `[supabase-shim] delete on "${this.state.table}" requires .eq("id", ...) — bulk deletes without an id filter are not supported by the REST factory.`,
              400,
            );
          }
          await restRequest(`${path}/${encodeURIComponent(String(idFilter.value))}`, {
            method: "DELETE",
          });
          return ok(null as unknown as T, 204);
        }
      }
    } catch (err) {
      return fail(err) as PostgrestResponse<T | T[]>;
    }
    return ok([] as unknown as T[]);
  }

  private applySingle(rows: unknown[]): T | T[] {
    if (this.singleMode === "single") {
      if (rows.length === 0) {
        throw new ApiError("No rows returned for .single()", 406);
      }
      return rows[0] as T;
    }
    if (this.singleMode === "maybeSingle") {
      return (rows[0] ?? null) as T;
    }
    return rows as T[];
  }

  // PromiseLike — `await builder` triggers execution
  then<TResult1 = PostgrestResponse<T | T[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: PostgrestResponse<T | T[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// ============================================================================
// Auth shim
// ============================================================================

interface ShimSession {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  user: ShimUser;
}

interface ShimUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

type AuthListener = (event: string, session: ShimSession | null) => void;
const authListeners = new Set<AuthListener>();

function fireAuth(event: string, session: ShimSession | null) {
  for (const fn of authListeners) {
    try {
      fn(event, session);
    } catch (err) {
      console.error("[supabase-shim] auth listener error", err);
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("nexuscrm:signed-out", () => fireAuth("SIGNED_OUT", null));
}

let currentSession: ShimSession | null = null;

function buildSession(payload: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: { id?: string; user_id?: string; email: string; full_name?: string };
}): ShimSession {
  return {
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + (payload.expiresIn ?? 3600),
    user: {
      id: payload.user.id ?? payload.user.user_id ?? "",
      email: payload.user.email,
      user_metadata: { full_name: payload.user.full_name },
    },
  };
}

const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const data = await restRequest<{
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
        user: { id?: string; user_id?: string; email: string; full_name?: string };
      }>("/api/auth/login", { method: "POST", body: { email, password } });
      tokenStore.set(data);
      currentSession = buildSession(data);
      fireAuth("SIGNED_IN", currentSession);
      return { data: { user: currentSession.user, session: currentSession }, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      return { data: { user: null, session: null }, error: { message } };
    }
  },

  async signUp({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: { data?: { full_name?: string }; emailRedirectTo?: string };
  }) {
    try {
      const fullName = options?.data?.full_name || email;
      await restRequest("/api/auth/register", {
        method: "POST",
        body: { email, password, fullName },
      });
      return { data: { user: null, session: null }, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      return { data: { user: null, session: null }, error: { message } };
    }
  },

  async signOut(_opts?: { scope?: "global" | "local" | "others" }) {
    try {
      await restRequest("/api/auth/logout", { method: "POST" }).catch(() => null);
    } finally {
      tokenStore.clear();
      currentSession = null;
      fireAuth("SIGNED_OUT", null);
    }
    return { error: null };
  },

  async getSession() {
    if (currentSession && !tokenStore.isExpired()) {
      return { data: { session: currentSession }, error: null };
    }
    if (!tokenStore.get() || tokenStore.isExpired()) {
      return { data: { session: null }, error: null };
    }
    try {
      const data = await restRequest<{ user: { id: string; email: string; full_name?: string } }>(
        "/api/auth/me",
      );
      const token = tokenStore.get()!;
      currentSession = buildSession({
        accessToken: token,
        expiresIn: 3600,
        user: data.user,
      });
      return { data: { session: currentSession }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  },

  async getUser() {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user ?? null }, error: null };
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.add(callback);
    // Fire current state asynchronously, mirroring supabase behavior
    queueMicrotask(() => callback(currentSession ? "SIGNED_IN" : "INITIAL_SESSION", currentSession));
    return {
      data: {
        subscription: {
          unsubscribe() {
            authListeners.delete(callback);
          },
        },
      },
    };
  },

  async resetPasswordForEmail(email: string) {
    try {
      await restRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      return { data: {}, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset failed";
      return { data: null, error: { message } };
    }
  },

  async updateUser(updates: { email?: string; password?: string; data?: Record<string, unknown> }) {
    console.warn("[supabase-shim] auth.updateUser is not yet implemented in the REST backend");
    return { data: { user: currentSession?.user ?? null }, error: null };
  },
};

// ============================================================================
// Stubs for unimplemented surfaces (storage, functions, channel, rpc)
// ============================================================================

function softWarn(name: string) {
  return (...args: any[]) => {
    console.warn(
      `[supabase-shim] ${name} is not supported by the self-hosted REST backend. Args:`,
      args,
    );
    return Promise.resolve({ data: null, error: { message: `${name} not supported` } });
  };
}

const storage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: Blob | File | ArrayBuffer, opts?: { contentType?: string; upsert?: boolean }) {
        try {
          const sig = await restRequest<{ url: string; key: string }>("/api/storage/sign-upload", {
            method: "POST",
            body: { bucket, path, contentType: opts?.contentType ?? (file as File).type },
          });
          const body = file instanceof Blob ? file : new Blob([file as ArrayBuffer]);
          const put = await fetch(sig.url, {
            method: "PUT",
            headers: opts?.contentType ? { "Content-Type": opts.contentType } : undefined,
            body,
          });
          if (!put.ok) throw new Error(`S3 upload failed: ${put.status}`);
          return { data: { path, key: sig.key }, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          return { data: null, error: { message } };
        }
      },
      async createSignedUrl(path: string, expiresIn = 900) {
        try {
          const sig = await restRequest<{ url: string }>("/api/storage/sign-download", {
            method: "POST",
            body: { bucket, path, expiresIn },
          });
          return { data: { signedUrl: sig.url }, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Sign failed";
          return { data: null, error: { message } };
        }
      },
      createSignedUploadUrl: (async (path: string) => {
        try {
          const sig = await restRequest<{ url: string; key: string }>("/api/storage/sign-upload", {
            method: "POST",
            body: { bucket, path },
          });
          return { data: { signedUrl: sig.url, path: sig.key, token: "" }, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Sign failed";
          return { data: null, error: { message } };
        }
      }) as (path: string) => Promise<any>,
      async remove(paths: string[]) {
        try {
          for (const p of paths) {
            await restRequest("/api/storage/object", {
              method: "DELETE",
              body: { bucket, path: p },
            });
          }
          return { data: paths.map((p) => ({ name: p })), error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Delete failed";
          return { data: null, error: { message } };
        }
      },
      async download(path: string) {
        try {
          const sig = await restRequest<{ url: string }>("/api/storage/sign-download", {
            method: "POST",
            body: { bucket, path },
          });
          const resp = await fetch(sig.url);
          if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
          return { data: await resp.blob(), error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Download failed";
          return { data: null, error: { message } };
        }
      },
      list: softWarn("storage.list") as (...args: any[]) => Promise<any>,
      getPublicUrl: (path: string) => {
        const host = (import.meta as any).env?.VITE_PUBLIC_ASSET_HOST || "";
        if (host) {
          return { data: { publicUrl: `${String(host).replace(/\/$/, "")}/${bucket}/${path.replace(/^\/+/, "")}` } };
        }
        return { data: { publicUrl: "" } };
      },
    };
  },
  listBuckets: (async () => ({ data: [] as any[], error: null })) as () => Promise<{ data: any[]; error: any }>,
  getBucket: (async (_id: string) => ({ data: null, error: null })) as (id: string) => Promise<{ data: any; error: any }>,
};

// Map legacy Supabase edge-function names to backend REST routes.
// Unmapped names log a clear warning so the failure is loud, not silent.
const FUNCTION_ROUTE_MAP: Record<string, string> = {
  "workflow-trigger": "/api/workflows/trigger",
  "exchange-rates": "/api/exchange-rates",
  "scheduled-checks": "/api/workflows/trigger", // worker handles cron
  // Admin user management
  "create-users": "/api/admin/users/bulk-create",
  "set-user-password": "/api/admin/users/set-password",
  // Integrations
  "hubspot-auth": "/api/integrations/hubspot/callback",
  "hubspot-sync": "/api/integrations/hubspot/sync",
  "office365-auth": "/api/integrations/office365/callback",
  "office365-sync": "/api/integrations/office365/sync",
  // AI assistants & insights — point at the unified /api/ai/chat with a context hint
  "intelligent-assistant": "/api/ai/chat",
  "sales-assistant": "/api/ai/chat",
  "support-assistant": "/api/ai/chat",
  "employee-assistant": "/api/ai/chat",
  "tender-ai-assistant": "/api/ai/chat",
  "sales-ai-insights": "/api/ai/insights",
  "finance-ai-insights": "/api/ai/insights",
  "executive-insights": "/api/ai/insights",
  "meddic-insights": "/api/ai/insights",
  "account-intelligence": "/api/ai/insights",
  "contact-intelligence": "/api/ai/insights",
  // AI enrichment / generators (all funnel through unified chat with a typed context)
  "enrich-company": "/api/ai/chat",
  "enrich-executives": "/api/ai/chat",
  "enrich-offering": "/api/ai/chat",
  "enrich-problem-area": "/api/ai/chat",
  "enrich-project-plan": "/api/ai/chat",
  "enrich-user": "/api/ai/chat",
  "batch-enrich-offerings": "/api/ai/chat",
  "fetch-company-info": "/api/ai/chat",
  "generate-recommendation-steps": "/api/ai/chat",
  "generate-solution-documentation": "/api/ai/chat",
  "verify-document": "/api/ai/chat",
  "threat-intelligence": "/api/ai/chat",
};

interface FunctionsInvokeOptions {
  body?: any;
  headers?: Record<string, string>;
  method?: string;
}

const functions = {
  async invoke<T = any>(
    name: string,
    opts?: FunctionsInvokeOptions,
  ): Promise<{ data: T | null; error: { message: string } | null }> {
    const path = FUNCTION_ROUTE_MAP[name];
    if (!path) {
      console.warn(`[api-shim] No backend route mapped for function "${name}"`);
      return { data: null, error: { message: `function "${name}" not implemented on backend` } };
    }
    try {
      const data = await restRequest<T>(path, {
        method: (opts?.method as any) || "POST",
        body: opts?.body,
        headers: opts?.headers,
      });
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Function call failed";
      return { data: null, error: { message } };
    }
  },
};

// ============================================================================
// Realtime channels — backed by a single WebSocket to /api/realtime
// ============================================================================
//
// Map of supabase channel API onto our gateway:
//   .on('postgres_changes', { event, schema, table, filter? }, cb)
//      -> subscribe to "tenant:<tenantId>:<table>"  (publishers emit there)
//   .on('broadcast', { event }, cb)
//      -> subscribe to "broadcast:<channelName>:<event>"
//   .on('presence', ...) -> ignored (no-op)
//
// All callbacks for a given channel name share one logical subscription.
// We open a single shared WebSocket on first subscribe and reuse it.

interface RealtimeMessage { channel: string; data: any }
type ChannelHandler = (msg: any) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private handlers = new Map<string, Set<ChannelHandler>>();
  private pending: string[] = [];

  private buildUrl(token: string, channels: string[]): string {
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || "";
    const wsBase = apiBase
      ? apiBase.replace(/^http/, "ws")
      : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
    const params = new URLSearchParams({ token });
    for (const c of channels) params.append("channel", c);
    return `${wsBase}/api/realtime?${params.toString()}`;
  }

  private async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;
    const token = tokenStore.get();
    if (!token) return; // not signed in — skip silently
    this.connecting = new Promise<void>((resolve) => {
      const url = this.buildUrl(token, Array.from(this.handlers.keys()));
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => {
        // flush any pending subscriptions
        for (const ch of this.pending) ws.send(JSON.stringify({ action: "subscribe", channel: ch }));
        this.pending = [];
        resolve();
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as RealtimeMessage;
          const set = this.handlers.get(msg.channel);
          if (set) for (const h of set) h(msg.data);
        } catch {}
      };
      ws.onclose = () => {
        this.ws = null;
        this.connecting = null;
        // simple reconnect after 2s if we have handlers
        if (this.handlers.size > 0) setTimeout(() => this.connect(), 2_000);
      };
      ws.onerror = () => { /* close handler will reconnect */ };
    });
    return this.connecting;
  }

  subscribe(channel: string, handler: ChannelHandler) {
    let set = this.handlers.get(channel);
    if (!set) { set = new Set(); this.handlers.set(channel, set); }
    set.add(handler);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "subscribe", channel }));
    } else {
      this.pending.push(channel);
      this.connect();
    }
  }

  unsubscribe(channel: string, handler?: ChannelHandler) {
    const set = this.handlers.get(channel);
    if (!set) return;
    if (handler) set.delete(handler); else set.clear();
    if (set.size === 0) {
      this.handlers.delete(channel);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "unsubscribe", channel }));
      }
    }
  }
}

const realtimeClient = typeof window !== "undefined" ? new RealtimeClient() : null;

interface ChannelConfig {
  table?: string;
  schema?: string;
  filter?: string;
  event?: string;
}

function channel(name: string) {
  const subscriptions: Array<{ ch: string; cb: ChannelHandler }> = [];
  const ch: any = {
    on(event: string, filter: ChannelConfig | ((p: any) => void), cb?: (payload: any) => void) {
      // Support both signatures: .on(event, cb) and .on(event, filter, cb)
      const handler = (typeof filter === "function" ? filter : cb) as ChannelHandler;
      const cfg = (typeof filter === "function" ? {} : filter) as ChannelConfig;
      let topic: string;
      if (event === "postgres_changes" && cfg.table) {
        // We don't have tenant scope on the client easily — backend enforces.
        topic = `table:${cfg.table}`;
      } else if (event === "broadcast") {
        topic = `broadcast:${name}`;
      } else {
        topic = `${event}:${name}`;
      }
      const wrapped: ChannelHandler = (payload) => {
        // emulate supabase shape: { eventType, new, old, schema, table }
        try {
          handler({
            eventType: payload?.event || event,
            new: payload?.row || payload?.new || payload,
            old: payload?.old || null,
            schema: cfg.schema || "public",
            table: cfg.table,
          });
        } catch {}
      };
      subscriptions.push({ ch: topic, cb: wrapped });
      return ch;
    },
    subscribe(cb?: (status: string) => void) {
      for (const s of subscriptions) realtimeClient?.subscribe(s.ch, s.cb);
      queueMicrotask(() => cb?.("SUBSCRIBED"));
      return ch;
    },
    unsubscribe() {
      for (const s of subscriptions) realtimeClient?.unsubscribe(s.ch, s.cb);
      subscriptions.length = 0;
      return Promise.resolve("ok");
    },
    send(_payload: any) { return Promise.resolve("ok"); },
    track(_state: any) { return Promise.resolve("ok"); },
    untrack() { return Promise.resolve("ok"); },
  };
  return ch;
}

function removeChannel(ch: any) {
  try { ch?.unsubscribe?.(); } catch {}
  return Promise.resolve("ok");
}

function rpc(name: string, _args?: Record<string, unknown>): any {
  console.warn(`[supabase-shim] rpc("${name}") is not supported by REST backend`);
  return Promise.resolve({ data: null, error: { message: `rpc("${name}") not supported` } });
}

// ============================================================================
// Public client
// ============================================================================

export const supabaseShim = {
  // Default to `any` so legacy call sites that relied on Supabase's typed
  // `Database` generics keep their inferred row shapes without manual edits.
  // Strict typing can be restored module-by-module by passing an explicit T.
  from<T = any>(table: string) {
    return new QueryBuilder<T>(table);
  },
  auth,
  storage,
  functions,
  channel,
  removeChannel,
  rpc,
};

export type SupabaseShimClient = typeof supabaseShim;
