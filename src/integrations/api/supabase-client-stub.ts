/**
 * Stub that the AWS production build aliases in place of
 * `@/integrations/supabase/client`. Re-exports the REST shim so any stray
 * `import { supabase } from "@/integrations/supabase/client"` in the codebase
 * resolves to the self-hosted Fastify backend instead of Supabase.
 *
 * The Lovable editor regenerates `src/integrations/supabase/client.ts`
 * automatically, so we cannot edit it directly. The Vite production alias
 * in `vite.config.ts` redirects the import path to this file at build time.
 */
export { supabaseShim as supabase } from "./supabase-shim";
