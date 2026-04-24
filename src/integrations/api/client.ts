/**
 * Drop-in alternative to `@/integrations/supabase/client` that talks to the
 * self-hosted Fastify backend (PostgreSQL + Cognito) instead of Supabase.
 *
 * To migrate a file off Supabase, change:
 *
 *     import { supabase } from "@/integrations/supabase/client";
 *
 * to:
 *
 *     import { supabase } from "@/integrations/api/client";
 *
 * The shim implements the most common subset of the Supabase JS API. See
 * `src/integrations/api/supabase-shim.ts` for the supported surface and known
 * limitations (no embedded selects, no realtime, no storage, no edge
 * functions). Calls to unsupported features throw a descriptive error so they
 * surface immediately instead of silently failing.
 */
export { supabaseShim as supabase } from "./supabase-shim";
export { restClient, restRequest, ApiError, tokenStore } from "./rest-client";
export type { PostgrestResponse, SupabaseShimClient } from "./supabase-shim";
