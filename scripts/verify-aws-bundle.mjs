#!/usr/bin/env node
/**
 * verify-aws-bundle.mjs — Post-build cleanliness check for AWS deployments.
 *
 * Scans the production `dist/` output and fails (exit 1) if any forbidden
 * string is found. This guarantees the artifact we ship to AWS is fully
 * decoupled from Lovable Cloud and Supabase.
 *
 * Run after `vite build --mode production`:
 *   node scripts/verify-aws-bundle.mjs
 *
 * Wired into CI in `.github/workflows/deploy.yml` as a deploy gate.
 *
 * Exit codes:
 *   0  — bundle is clean, safe to deploy
 *   1  — forbidden string found, abort deploy
 *   2  — dist/ directory missing or unreadable
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

// ----------------------------------------------------------------------------
// Forbidden patterns
//
// Every entry must NOT appear anywhere in the production bundle. Each entry is
// either a literal string or a RegExp. The check is case-insensitive for
// safety (e.g. "Lovable" / "LOVABLE" / "lovable" all matter).
// ----------------------------------------------------------------------------
const FORBIDDEN = [
  {
    label: "supabase.co URL",
    pattern: /supabase\.co/i,
    why: "Frontend would call Supabase REST/Realtime instead of the AWS backend.",
  },
  {
    label: "@supabase/supabase-js import",
    pattern: /@supabase\/supabase-js/i,
    why: "The Supabase JS client should be aliased away in production builds.",
  },
  {
    label: "lovable reference",
    pattern: /lovable/i,
    why: "Production bundle must not reference Lovable infrastructure.",
  },
];

// File extensions to scan. We deliberately skip binary assets (images, fonts,
// etc.) — even if they happen to contain a matching byte sequence, they cannot
// affect runtime behavior.
const SCANNABLE_EXTS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".webmanifest",
  ".map",
  ".txt",
  ".svg",
]);

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFiles(full));
    } else if (SCANNABLE_EXTS.has(extname(entry).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
let distStat;
try {
  distStat = statSync(DIST);
} catch {
  console.error(`✘ dist/ not found at ${DIST}`);
  console.error("  Run \`vite build --mode production\` first.");
  process.exit(2);
}
if (!distStat.isDirectory()) {
  console.error(`✘ ${DIST} is not a directory`);
  process.exit(2);
}

const files = listFiles(DIST);
console.log(`Scanning ${files.length} files in dist/ for forbidden strings…`);

const findings = [];
let bytesScanned = 0;

for (const file of files) {
  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    // Binary or unreadable — skip silently.
    continue;
  }
  bytesScanned += Buffer.byteLength(contents);

  for (const rule of FORBIDDEN) {
    const match = contents.match(rule.pattern);
    if (match) {
      const idx = match.index ?? 0;
      const start = Math.max(0, idx - 40);
      const end = Math.min(contents.length, idx + match[0].length + 40);
      // Collapse whitespace in the snippet for a single-line preview.
      const snippet = contents.slice(start, end).replace(/\s+/g, " ").trim();
      findings.push({
        file: relative(ROOT, file),
        rule,
        snippet,
      });
    }
  }
}

console.log(`Scanned ${fmtBytes(bytesScanned)} across ${files.length} files.`);

if (findings.length === 0) {
  const manifestPath = join(DIST, "release-manifest.json");
  let releaseManifest;
  try {
    releaseManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    console.error("✘ release-manifest.json is missing or invalid.");
    process.exit(1);
  }
  const html = readFileSync(join(DIST, "index.html"), "utf8");
  const manifestIsProduction = releaseManifest.environment === "production";
  const invalidProductionIdentity =
    manifestIsProduction &&
    (!releaseManifest.releaseId || !releaseManifest.commit || releaseManifest.commit === "dev");
  const htmlIdentityMismatch =
    !html.includes(`name="release-id" content="${releaseManifest.releaseId}"`) ||
    !html.includes(`name="build-commit" content="${releaseManifest.commit}"`);
  if (invalidProductionIdentity || htmlIdentityMismatch) {
    console.error("✘ Release identity is missing, set to dev, or inconsistent across the manifest and HTML.");
    process.exit(1);
  }
  console.log("");
  console.log("✓ Bundle is clean — no Supabase or Lovable references found.");
  console.log(`✓ Release identity verified: ${releaseManifest.releaseId}`);
  console.log("✓ Safe to deploy to AWS.");
  process.exit(0);
}

// ----------------------------------------------------------------------------
// Report failure with actionable detail
// ----------------------------------------------------------------------------
console.error("");
console.error(`✘ Found ${findings.length} forbidden reference(s):`);
console.error("");

const grouped = new Map();
for (const f of findings) {
  const key = f.rule.label;
  if (!grouped.has(key)) grouped.set(key, { rule: f.rule, items: [] });
  grouped.get(key).items.push(f);
}

for (const { rule, items } of grouped.values()) {
  console.error(`  ▸ ${rule.label}  (${items.length} occurrence${items.length > 1 ? "s" : ""})`);
  console.error(`    Why it matters: ${rule.why}`);
  for (const item of items.slice(0, 3)) {
    console.error(`    - ${item.file}`);
    console.error(`        …${item.snippet}…`);
  }
  if (items.length > 3) {
    console.error(`    - …and ${items.length - 3} more`);
  }
  console.error("");
}

console.error("Aborting deploy. Fix the source of these references and rebuild.");
console.error("Common causes:");
console.error("  - Vite production aliases in vite.config.ts were removed");
console.error("  - A new file imported '@supabase/supabase-js' or '@/integrations/supabase/client'");
console.error("  - A hard-coded Supabase URL was added to source code");
console.error("  - A new 'VITE_SUPABASE_*' env var was read without being scrubbed in vite.config.ts `define`");
process.exit(1);
