import { APPROVED_DESIGN_REVISION } from "@/lib/approved-design-identity";

/**
 * Device-level theme persistence.
 *
 * The theme is intentionally tied to the approved design revision. Older builds
 * saved `nexus-theme` and `nexus_theme` without a design revision, allowing a
 * retired visual system to override the current shell after cache cleanup.
 * From r8 onward, only themes stamped with the current approved design revision
 * are accepted; stale theme values are deleted and the current default wins.
 */

export type ThemeMode = "light" | "dark";
export type ThemeBrand = "emerald" | "blue" | "purple" | "orange";
export type ThemeMood = "default" | "ocean" | "forest" | "sunset" | "midnight" | "cyber";

export interface ThemeConfig {
  mode: ThemeMode;
  brand: ThemeBrand;
  mood: ThemeMood;
}

interface StoredThemeConfig extends ThemeConfig {
  revision: number;
}

/** Stable, unversioned. Never suffix this with a schema version again. */
export const THEME_KEY = "nexus-theme";
export const THEME_COOKIE = "nexus_theme";
export const THEME_REVISION = APPROVED_DESIGN_REVISION;

/** Keys written by older builds, read once and migrated forward. */
export const LEGACY_THEME_KEYS = ["nexus-theme:v2", "nexus-theme:v1", "app-theme-config"];

export const DEFAULT_THEME: ThemeConfig = { mode: "light", brand: "emerald", mood: "cyber" };

const MODES: ThemeMode[] = ["light", "dark"];
const BRANDS: ThemeBrand[] = ["emerald", "blue", "purple", "orange"];
const MOODS: ThemeMood[] = ["default", "ocean", "forest", "sunset", "midnight", "cyber"];

function normalizeThemeShape(value: unknown): ThemeConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ThemeConfig>;
  if (!MODES.includes(raw.mode as ThemeMode)) return null;
  return {
    mode: raw.mode as ThemeMode,
    brand: BRANDS.includes(raw.brand as ThemeBrand) ? (raw.brand as ThemeBrand) : DEFAULT_THEME.brand,
    mood: MOODS.includes(raw.mood as ThemeMood) ? (raw.mood as ThemeMood) : DEFAULT_THEME.mood,
  };
}

export function normalizeTheme(value: unknown): ThemeConfig | null {
  const theme = normalizeThemeShape(value);
  if (!theme || typeof value !== "object") return null;
  const revision = (value as Partial<StoredThemeConfig>).revision;
  return revision === THEME_REVISION ? theme : null;
}

function parse(raw: string | null): ThemeConfig | null {
  if (!raw) return null;
  try {
    return normalizeTheme(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readThemeCookie(cookie: string): ThemeConfig | null {
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    return parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function safeLocal(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function clearThemeCookie(): void {
  try {
    if (typeof document !== "undefined") {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
    }
  } catch {
    /* ignore */
  }
}

export function clearStoredTheme(): void {
  try {
    const store = safeLocal();
    store?.removeItem(THEME_KEY);
    for (const key of LEGACY_THEME_KEYS) store?.removeItem(key);
  } catch {
    /* ignore */
  }
  clearThemeCookie();
}

/**
 * Resolution order: stable key → cookie mirror → legacy versioned keys →
 * OS preference → app default. Any hit outside the stable key is written
 * back so the next boot is a single-step read.
 */
export function readStoredTheme(): ThemeConfig {
  const store = safeLocal();
  const stable = parse(store?.getItem(THEME_KEY) ?? null);
  if (stable) return stable;

  const cookie = typeof document === "undefined" ? null : readThemeCookie(document.cookie);
  if (cookie) {
    writeStoredTheme(cookie);
    return cookie;
  }

  clearStoredTheme();
  return DEFAULT_THEME;
}

export function writeStoredTheme(theme: ThemeConfig): void {
  const persisted: StoredThemeConfig = { ...theme, revision: THEME_REVISION };
  const serialized = JSON.stringify(persisted);
  try {
    safeLocal()?.setItem(THEME_KEY, serialized);
  } catch {
    /* storage may be unavailable — the cookie below is the fallback */
  }
  try {
    if (typeof document !== "undefined") {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      // One year, site-wide, lax so it is sent on the top-level navigation
      // that renders index.html and its pre-paint theme bootstrap.
      document.cookie = `${THEME_COOKIE}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    }
  } catch {
    /* ignore */
  }
}

/** Apply a theme to <html>. Mirrors the inline bootstrap in index.html. */
export function applyThemeToDocument(theme: ThemeConfig): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(theme.mode);
  el.setAttribute("data-brand", theme.brand);
  el.setAttribute("data-mood", theme.mood);
  el.style.colorScheme = theme.mode;
}
