import { APPROVED_DESIGN_ID, APPROVED_DESIGN_REVISION } from "@/lib/approved-design-identity";

/**
 * Approved-theme persistence.
 *
 * The platform has one allowed visual identity. Older builds and user-selected
 * variants could leave a valid-looking `nexus-theme` value behind, which the
 * pre-paint bootstrap applied for a moment before React normalized it. From r9
 * onward, the only loadable theme is DEFAULT_THEME stamped with the current
 * approved design revision and design id. Anything else is purged.
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
  designId: string;
}

/** Stable, unversioned. Never suffix this with a schema version again. */
export const THEME_KEY = "nexus-theme";
export const THEME_COOKIE = "nexus_theme";
export const THEME_REVISION = APPROVED_DESIGN_REVISION;
export const THEME_DESIGN_ID = APPROVED_DESIGN_ID;

/** Keys written by older builds, read once and migrated forward. */
export const LEGACY_THEME_KEYS = ["nexus-theme:v4", "nexus-theme:v3", "nexus-theme:v2", "nexus-theme:v1", "app-theme-config"];

export const DEFAULT_THEME: ThemeConfig = { mode: "light", brand: "emerald", mood: "default" };

const MODES: ThemeMode[] = ["light"];
const BRANDS: ThemeBrand[] = ["emerald"];
const MOODS: ThemeMood[] = ["default"];

function normalizeThemeShape(value: unknown): ThemeConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ThemeConfig>;
  if (!MODES.includes(raw.mode as ThemeMode)) return null;
  if (!BRANDS.includes(raw.brand as ThemeBrand)) return null;
  if (!MOODS.includes(raw.mood as ThemeMood)) return null;
  const theme = {
    mode: raw.mode as ThemeMode,
    brand: raw.brand as ThemeBrand,
    mood: raw.mood as ThemeMood,
  };
  return isApprovedDefaultTheme(theme) ? DEFAULT_THEME : null;
}

function isApprovedDefaultTheme(theme: ThemeConfig): boolean {
  return (
    theme.mode === DEFAULT_THEME.mode &&
    theme.brand === DEFAULT_THEME.brand &&
    theme.mood === DEFAULT_THEME.mood
  );
}

export function normalizeTheme(value: unknown): ThemeConfig | null {
  const theme = normalizeThemeShape(value);
  if (!theme || typeof value !== "object") return null;
  const stored = value as Partial<StoredThemeConfig>;
  if (stored.revision !== THEME_REVISION) return null;
  if (stored.designId !== THEME_DESIGN_ID) return null;
  return theme;
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
  clearStoredTheme();
  return DEFAULT_THEME;
}

export function writeStoredTheme(_theme: ThemeConfig): void {
  clearStoredTheme();
}

/** Apply a theme to <html>. Mirrors the inline bootstrap in index.html. */
export function applyThemeToDocument(theme: ThemeConfig): void {
  if (typeof document === "undefined") return;
  const approvedTheme = isApprovedDefaultTheme(theme) ? theme : DEFAULT_THEME;
  const el = document.documentElement;
  el.classList.remove("dark");
  el.classList.add("light");
  el.setAttribute("data-brand", "emerald");
  el.removeAttribute("data-mood");
  el.style.colorScheme = "light";
}
