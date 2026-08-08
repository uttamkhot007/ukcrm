/**
 * Data client used across the app.
 *
 * Historically this file always exported the Supabase-compatible REST shim
 * that talks to the self-hosted Fastify backend. When that backend is not
 * reachable (e.g. the hosted preview environment), every query 404s and React
 * Query retries with backoff — which shows up as modules that "never finish
 * loading".
 *
 * We now pick the transport at runtime:
 *   - `VITE_API_URL` configured  -> self-hosted Fastify backend (shim)
 *   - otherwise                  -> managed backend client
 *
 * In the AWS production build, `@/integrations/supabase/client` is aliased to
 * `./supabase-client-stub.ts` (which re-exports the shim), so the fallback is
 * always the self-hosted backend there regardless of the branch taken.
 */
import { supabaseShim } from "./supabase-shim";
import { supabase as managedClient } from "@/integrations/supabase/client";

const selfHostedApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const useSelfHostedBackend = Boolean(selfHostedApiUrl);

export const supabase = (useSelfHostedBackend
  ? supabaseShim
  : managedClient) as typeof supabaseShim;

export { supabaseShim };
export { restClient, restRequest, ApiError, tokenStore } from "./rest-client";
export type { PostgrestResponse, SupabaseShimClient } from "./supabase-shim";
