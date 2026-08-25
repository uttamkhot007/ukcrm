/**
 * Minimal CSS cascade resolver used by the theme regression tests.
 *
 * It reads `src/index.css`, collects every custom-property declaration and
 * replays it in source order for a synthetic element that carries the classes
 * / attributes a given theme combination would produce at runtime
 * (`html.light[data-brand="emerald"]`, ...).
 *
 * This gives us a deterministic, browser-free way to prove that no dark token
 * survives into light mode for ANY mood/brand combination.
 */
import fs from "node:fs";
import path from "node:path";

export interface CssRule {
  selector: string;
  declarations: Record<string, string>;
}

export interface ThemeElement {
  /** e.g. ["html", ":root", ".light", '[data-brand="emerald"]'] */
  tokens: string[];
}

const CSS_PATH = path.resolve(__dirname, "../index.css");

export function readIndexCss(): string {
  return fs.readFileSync(CSS_PATH, "utf8");
}

/** Parse all rules that declare CSS custom properties, in source order. */
export function parseCustomPropertyRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  let i = 0;
  let buffer = "";
  const stack: string[] = [];

  while (i < css.length) {
    const ch = css[i];

    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }

    if (ch === "{") {
      const selector = buffer.trim();
      buffer = "";
      stack.push(selector);
      i += 1;
      continue;
    }

    if (ch === "}") {
      const selector = stack.pop() ?? "";
      const body = buffer;
      buffer = "";
      // Conditional groups (`@media print`, responsive tweaks) are not part of
      // the base theme cascade the app renders on screen.
      const insideConditional = stack.some((ancestor) => ancestor.startsWith("@media"));
      if (selector && !selector.startsWith("@") && !insideConditional) {
        const declarations = parseDeclarations(body);
        if (Object.keys(declarations).length > 0) {
          rules.push({ selector, declarations });
        }
      }

      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  return rules;
}

function parseDeclarations(body: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  let depth = 0;
  let current = "";
  const flush = () => {
    const decl = current.trim();
    current = "";
    if (!decl.startsWith("--")) return;
    const idx = decl.indexOf(":");
    if (idx === -1) return;
    declarations[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim();
  };

  for (const ch of body) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === ";" && depth === 0) {
      flush();
      continue;
    }
    current += ch;
  }
  flush();
  return declarations;
}

const SIMPLE_TOKEN = /(\[[^\]]+\]|[.#:][A-Za-z0-9_:()\-="[\]]+|[a-zA-Z][a-zA-Z0-9-]*)/g;

/**
 * Matches only flat compound selectors (no combinators, no pseudo-elements).
 * Descendant selectors in the theme layer duplicate a flat sibling rule, so
 * skipping them keeps the resolver honest without losing coverage.
 */
export function selectorMatches(selectorPart: string, element: ThemeElement): boolean {
  const part = selectorPart.trim();
  if (!part) return false;
  if (/[\s>+~]/.test(part)) return false;
  if (part.includes("::")) return false;
  if (part.includes(":not(")) return false;

  const tokens = part.match(SIMPLE_TOKEN) ?? [];
  if (tokens.length === 0) return false;
  return tokens.every((token) => element.tokens.includes(token));
}

/** Replay the cascade in source order (later declaration wins). */
export function resolveTokens(rules: CssRule[], element: ThemeElement): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const rule of rules) {
    const matches = rule.selector
      .split(",")
      .some((part) => selectorMatches(part, element));
    if (!matches) continue;
    Object.assign(resolved, rule.declarations);
  }
  return resolved;
}

/** Lightness (0-100) of an `H S% L%` token value, or null when not a plain HSL triple. */
export function tokenLightness(value: string): number | null {
  const match = value
    .trim()
    .match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%(\s*\/\s*[\d.]+%?)?$/);
  if (!match) return null;
  return Number(match[3]);
}

export function buildElement(options: {
  mode: "light" | "dark";
  mood?: string;
  brand?: string;
}): ThemeElement {
  const tokens = ["html", ":root", "body"];
  tokens.push(options.mode === "light" ? ".light" : ".dark");
  if (options.mood) tokens.push(`[data-mood="${options.mood}"]`);
  if (options.brand) tokens.push(`[data-brand="${options.brand}"]`);
  return { tokens };
}
