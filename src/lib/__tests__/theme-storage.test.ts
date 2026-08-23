// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEME_KEY,
  normalizeTheme,
  readStoredTheme,
  readThemeCookie,
  writeStoredTheme,
} from "@/lib/theme-storage";

const LIGHT = { mode: "light", brand: "emerald", mood: "cyber" } as const;

describe("theme storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "nexus_theme=; path=/; max-age=0";
  });

  it("round-trips the chosen theme through localStorage and the cookie mirror", () => {
    writeStoredTheme(LIGHT);
    expect(JSON.parse(window.localStorage.getItem(THEME_KEY)!)).toEqual(LIGHT);
    expect(readThemeCookie(document.cookie)).toEqual(LIGHT);
    expect(readStoredTheme()).toEqual(LIGHT);
  });

  it("recovers the theme from the cookie when localStorage was wiped", () => {
    writeStoredTheme(LIGHT);
    window.localStorage.clear();
    expect(readStoredTheme()).toEqual(LIGHT);
    // and heals the stable key for the next boot
    expect(JSON.parse(window.localStorage.getItem(THEME_KEY)!)).toEqual(LIGHT);
  });

  it("migrates a legacy schema-versioned key forward", () => {
    window.localStorage.setItem("nexus-theme:v2", JSON.stringify(LIGHT));
    expect(readStoredTheme()).toEqual(LIGHT);
    expect(window.localStorage.getItem("nexus-theme:v2")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(THEME_KEY)!)).toEqual(LIGHT);
  });

  it("rejects malformed values and falls back to the default", () => {
    window.localStorage.setItem(THEME_KEY, "{not json");
    expect(readStoredTheme()).toEqual(DEFAULT_THEME);
    expect(normalizeTheme({ mode: "neon" })).toBeNull();
    expect(normalizeTheme({ mode: "light", brand: "bogus", mood: "bogus" })).toEqual({
      mode: "light",
      brand: DEFAULT_THEME.brand,
      mood: DEFAULT_THEME.mood,
    });
  });
});
