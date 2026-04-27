import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";

// Read package.json once at config-load time so we can inject the
// version string into the bundle (visible in the Build Version badge).
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "./package.json"), "utf-8")
) as { version: string };
const BUILD_TIME = new Date().toISOString();
const BUILD_COMMIT =
  process.env.LOVABLE_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "dev";

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
      // Replace the build-time placeholder in index.html so the static
      // fallback badge can show when this exact HTML payload was built.
      {
        name: "inject-build-time-into-html",
        enforce: "pre" as const,
        transformIndexHtml: {
          order: "pre" as const,
          handler(html: string) {
            return html.replace(/__INDEX_HTML_BUILT__/g, BUILD_TIME);
          },
        },
      },
      {
        name: "append-build-query-to-html-assets",
        transformIndexHtml: {
          order: "post" as const,
          handler(html: string) {
            const buildQuery = `build=${encodeURIComponent(BUILD_TIME)}`;
            return html.replace(/\b(src|href)="([^"#?]*(?:\/assets\/|\/src\/)[^"]+)"/g, (_match, attr, value) => {
              const separator = value.includes("?") ? "&" : "?";
              return `${attr}="${value}${separator}${buildQuery}"`;
            });
          },
        },
      },
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
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __APP_BUILD_TIME__: JSON.stringify(BUILD_TIME),
      __APP_COMMIT__: JSON.stringify(BUILD_COMMIT),
      ...(isProd
        ? {
            "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(""),
            "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(""),
            "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(""),
          }
        : {}),
    },
  };
});
