/**
 * Device-level theme persistence.
 *
 * Rules that this module exists to guarantee:
 *  - The stored key is NOT schema-versioned. Older builds wrote the theme to
 *    `nexus-theme:v<UI_STATE_SCHEMA_VERSION>`, so every schema bump silently
 *    reset a user's light theme back to the dark default.
 *  - The value is mirrored into a cookie. Cookies survive localStorage purges
 *    and are the only copy readable if storage is blocked (Safari private
 *    mode, third-party-storage restrictions).
 *  - The theme is device state, not account state: sign-out must never clear
 *    it, so it deliberately lives outside the `nexus-ui-state:` prefix that
 *    `clearPersistedUiState()` wipes.
 */

export type ThemeMode = "light" | "dark";
export type ThemeBrand = "emerald" | "blue" | "purple" | "orange";
export type ThemeMood = "default" | "ocean" | "forest" | "sunset" | "midnight" | "cyber";

export interface ThemeConfig {
  mode: ThemeMode;
  brand: ThemeBrand;
  mood: ThemeMood;
}

/** Stable, unversioned. Never suffix this with a schema version again. */
export const THEME_KEY = "nexus-theme";
export const THEME_COOKIE = "nexus_theme";

/** Keys written by older builds, read once and migrated forward. */
export const LEGACY_THEME_KEYS = ["nexus-theme:v2", "nexus-theme:v1", "app-theme-config"];

export const DEFAULT_THEME: ThemeConfig = { mode: "dark", brand: "emerald", mood: "cyber" };

const MODES: ThemeMode[] = ["light", "dark"];
const BRANDS: ThemeBrand[] = ["emerald", "blue", "purple", "orange"];
const MOODS: ThemeMood[] = ["default", "ocean", "forest", "sunset", "midnight", "cyber"];

export function normalizeTheme(value: unknown): ThemeConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ThemeConfig>;
  if (!MODES.includes(raw.mode as ThemeMode)) return null;
  return {
    mode: raw.mode as ThemeMode,
    brand: BRANDS.includes(raw.brand as ThemeBrand) ? (raw.brand as ThemeBrand) : DEFAULT_THEME.brand,
    mood: MOODS.includes(raw.mood as ThemeMood) ? (raw.mood as ThemeMood) : DEFAULT_THEME.mood,
  };
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

  for (const key of LEGACY_THEME_KEYS) {
    const legacy = parse(store?.getItem(key) ?? null);
    if (legacy) {
      writeStoredTheme(legacy);
      try {
        store?.removeItem(key);
      } catch {
        /* ignore */
      }
      return legacy;
    }
  }

  try {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return { ...DEFAULT_THEME, mode: "light" };
    }
  } catch {
    /* ignore */
  }

  return DEFAULT_THEME;
}

export function writeStoredTheme(theme: ThemeConfig): void {
  const serialized = JSON.stringify(theme);
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
