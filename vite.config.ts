import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// `lovable-tagger` is a Lovable-editor-only devDependency. Loading it lazily
// (and only in development) means the AWS production bundle has no hard
// dependency on it — `bun install --production` on AWS will succeed even if
// the package is removed from the registry or made private.
async function loadLovableTagger() {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const mod = await import("lovable-tagger");
    return mod.componentTagger();
  } catch {
    // Package not installed (e.g. AWS image). That's fine — it's editor-only.
    return null;
  }
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const tagger = mode === "development" ? await loadLovableTagger() : null;
  const isProd = mode === "production";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      tagger,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // ====================================================================
        // AWS production build: drop all Supabase dependencies.
        //
        // In production we redirect Supabase imports to local stubs so the
        // bundle ships with zero `@supabase/supabase-js` code and no calls
        // to Supabase URLs. The Lovable editor (development mode) keeps the
        // real Supabase client so the in-editor preview keeps working.
        // ====================================================================
        ...(isProd
          ? {
              "@supabase/supabase-js": path.resolve(
                __dirname,
                "./src/integrations/api/aws-types.ts"
              ),
              "@/integrations/supabase/client": path.resolve(
                __dirname,
                "./src/integrations/api/supabase-client-stub.ts"
              ),
            }
          : {}),
      },
    },
    // ========================================================================
    // AWS production: scrub Supabase env vars from the bundle.
    //
    // Vite normally inlines all `VITE_*` env vars at build time. Lovable's
    // auto-managed `.env` injects VITE_SUPABASE_URL/PROJECT_ID/PUBLISHABLE_KEY
    // for editor previews, but the AWS deployment must not ship those URLs.
    // We explicitly redefine them as empty strings so they evaporate from
    // the production bundle while still working in the Lovable editor.
    // ========================================================================
    define: isProd
      ? {
          "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(""),
          "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(""),
          "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(""),
        }
      : {},
  };
});
