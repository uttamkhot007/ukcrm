/**
 * Local type definitions used by the self-hosted AWS build path.
 *
 * These mirror the small subset of `@supabase/supabase-js` types that the
 * frontend actually consumes (via `useAuth.tsx`). Defining them locally lets
 * the production AWS bundle drop the `@supabase/supabase-js` dependency
 * entirely — the Vite alias rewrites any remaining `@supabase/supabase-js`
 * import to point at this file.
 *
 * Do NOT add Supabase-specific behavior here. This module is types-only plus
 * harmless runtime stubs for the rare cases where a value (not a type) is
 * imported from `@supabase/supabase-js`.
 */

export interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: User;
  [key: string]: unknown;
}

export interface AuthError {
  message: string;
  status?: number;
  name?: string;
}

// Runtime no-op constructors / classes — only present so that consumers doing
// `new SomeClass()` against the alias don't crash. Not used by this codebase
// today, but cheap insurance.
export class SupabaseClient {
  constructor() {
    throw new Error(
      "SupabaseClient is not available in the self-hosted AWS build. " +
        "Use the REST shim from @/integrations/api/client instead."
    );
  }
}

export const createClient = () => {
  throw new Error(
    "createClient() is not available in the self-hosted AWS build. " +
      "Import { supabase } from '@/integrations/api/client' instead."
  );
};
