/**
 * REST client targeting the self-hosted Fastify backend.
 *
 * This module is the low-level transport used by the Supabase-compatible shim
 * (`src/integrations/api/supabase-shim.ts`). It intentionally has no Supabase
 * dependencies so it can be used directly via `import { restClient } from
 * "@/integrations/api/rest-client"` for new code.
 */

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");

// Tokens live in memory only — never in localStorage/sessionStorage — so an
// XSS bug cannot read or exfiltrate them.
import { tokenStore } from "@/lib/token-store";
export type { AuthTokens } from "@/lib/token-store";
export { tokenStore };

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RestRequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export async function restRequest<T = unknown>(
  path: string,
  options: RestRequestOptions = {},
): Promise<T> {
  const { params, body, headers, ...rest } = options;

  let url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = finalHeaders["Content-Type"] ?? "application/json";
  }
  const token = tokenStore.get();
  if (token && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
        ? body
        : JSON.stringify(body),
  };

  const response = await fetch(url, init);

  if (response.status === 401) {
    tokenStore.clear();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nexuscrm:signed-out"));
    }
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).message)
        : null) ||
      (payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).error)
        : null) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const restClient = {
  request: restRequest,
  get baseUrl() {
    return API_URL;
  },
};
