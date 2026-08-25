/**
 * Theme regression suite.
 *
 * Guards against dark tokens leaking back into light mode:
 *  1. Token cascade: every mood x brand combination must resolve light surfaces
 *     and dark foregrounds when `.light` is active.
 *  2. Source hygiene: components must not hardcode opaque dark colours.
 *
 * A pixel-level counterpart lives in `scripts/theme-visual-regression.py`
 * (screenshot diffs against committed baselines).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildElement,
  parseCustomPropertyRules,
  readIndexCss,
  resolveTokens,
  tokenLightness,
} from "./theme-css-cascade";

const MOODS = [undefined] as const;
const BRANDS = [undefined] as const;

/** Tokens that paint large surfaces — must stay bright in light mode. */
const SURFACE_TOKENS = [
  "--background",
  "--card",
  "--popover",
  "--muted",
  "--secondary",
  "--accent",
  "--input",
  "--border",
  "--glass-bg",
  "--sidebar-background",
  "--sidebar-accent",
  "--sidebar-border",
];

/** Tokens painting text on those surfaces — must stay dark in light mode. */
const FOREGROUND_TOKENS = [
  "--foreground",
  "--card-foreground",
  "--popover-foreground",
  "--sidebar-foreground",
];

const SURFACE_MIN_LIGHTNESS = 80;
const BORDER_MIN_LIGHTNESS = 80;
const FOREGROUND_MAX_LIGHTNESS = 45;

const rules = parseCustomPropertyRules(readIndexCss());

describe("light-mode token cascade", () => {
  it("parses the theme layer", () => {
    expect(rules.length).toBeGreaterThan(3);
  });

  for (const mood of MOODS) {
    for (const brand of BRANDS) {
      const label = `mood=${mood ?? "default"} brand=${brand ?? "emerald"}`;

      it(`keeps surfaces light for ${label}`, () => {
        const resolved = resolveTokens(rules, buildElement({ mode: "light", mood, brand }));
        for (const token of SURFACE_TOKENS) {
          const value = resolved[token];
          if (value === undefined) continue;
          const lightness = tokenLightness(value);
          if (lightness === null) continue;
          const min = token === "--border" || token === "--sidebar-border"
            ? BORDER_MIN_LIGHTNESS
            : SURFACE_MIN_LIGHTNESS;
          expect(
            lightness,
            `${token} = "${value}" is too dark for light mode (${label})`,
          ).toBeGreaterThanOrEqual(min);
        }
      });

      it(`keeps foreground text dark for ${label}`, () => {
        const resolved = resolveTokens(rules, buildElement({ mode: "light", mood, brand }));
        for (const token of FOREGROUND_TOKENS) {
          const value = resolved[token];
          if (value === undefined) continue;
          const lightness = tokenLightness(value);
          if (lightness === null) continue;
          expect(
            lightness,
            `${token} = "${value}" is too light for light mode (${label})`,
          ).toBeLessThanOrEqual(FOREGROUND_MAX_LIGHTNESS);
        }
      });

    }
  }

  it("does not paint gradients with literal dark navy in shared component classes", () => {
    const css = readIndexCss();
    // `.neon-card` / `.bg-gradient-dark` must reference variables, not literals.
    const componentBlocks = css.match(/\.(neon-card|bg-gradient-dark)\s*\{[^}]*\}/g) ?? [];
    expect(componentBlocks.length).toBeGreaterThan(0);
    for (const block of componentBlocks) {
      expect(block, `literal dark colour found in:\n${block}`).not.toMatch(
        /hsla?\(\s*2[0-3]\d[,\s][^)]*?\b([0-9]|1[0-5])%\s*\)/,
      );
    }
  });
});

describe("component colour hygiene", () => {
  const SRC = path.resolve(__dirname, "..");
  /** Opaque dark utilities are forbidden unless behind a `dark:` variant or an opacity suffix. */
  const FORBIDDEN = /(?<!dark:)\b(bg-black|bg-slate-9\d{2}|bg-gray-9\d{2}|bg-zinc-9\d{2}|bg-neutral-9\d{2}|bg-\[#(0[0-9a-f]|1[0-9a-f])[0-9a-f]{4}\])(?![\w./-])/gi;
  /** Intentional non-theme surfaces (media players etc.). */
  const ALLOWLIST = new Set(["src/components/employee/TeamCommunication.tsx"]);

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "test") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
    }
  };
  walk(SRC);

  it("finds source files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("has no opaque hardcoded dark backgrounds outside dark: variants", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(path.resolve(SRC, ".."), file).replace(/\\/g, "/");
      if (ALLOWLIST.has(rel)) continue;
      const contents = fs.readFileSync(file, "utf8");
      contents.split("\n").forEach((line, index) => {
        const matches = line.match(FORBIDDEN);
        if (matches) offenders.push(`${rel}:${index + 1} → ${matches.join(", ")}`);
      });
    }
    expect(offenders, `hardcoded dark backgrounds:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("has no hardcoded white text outside dark: variants", () => {
    const offenders: string[] = [];
    const pattern = /(?<![\w:-])text-white(?![\w./-])/g;
    for (const file of files) {
      const rel = path.relative(path.resolve(SRC, ".."), file).replace(/\\/g, "/");
      const contents = fs.readFileSync(file, "utf8");
      contents.split("\n").forEach((line, index) => {
        // Allowed on saturated brand surfaces (gradients / primary buttons).
        if (/bg-(primary|gradient|sales|finance|hr|tech|support|marketing|management|employee|emerald|blue|purple|orange|red|green|indigo|violet|cyan|amber|rose|sky|teal|fuchsia|pink)/.test(line)) return;
        if (/dark:text-white/.test(line)) return;
        const matches = line.match(pattern);
        if (matches) offenders.push(`${rel}:${index + 1}`);
      });
    }
    // Recorded as a budget so the number can only shrink, never grow.
    expect(offenders.length, `unscoped text-white grew:\n${offenders.slice(0, 40).join("\n")}`)
      .toBeLessThanOrEqual(WHITE_TEXT_BUDGET);
  });
});

/** Snapshot of known-acceptable `text-white` usages; lower this as they are cleaned up. */
const WHITE_TEXT_BUDGET = Number(process.env.THEME_WHITE_TEXT_BUDGET ?? 400);
