// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEME_KEY,
  THEME_DESIGN_ID,
  THEME_REVISION,
  normalizeTheme,
  readStoredTheme,
  readThemeCookie,
  writeStoredTheme,
} from "@/lib/theme-storage";

const LIGHT = { mode: "light", brand: "emerald", mood: "cyber" } as const;
const OLD_VARIANT = { mode: "dark", brand: "purple", mood: "midnight" } as const;

describe("theme storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "nexus_theme=; path=/; max-age=0";
  });

  it("keeps the approved theme runtime-only without localStorage or cookie persistence", () => {
    writeStoredTheme(LIGHT);
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
    expect(readThemeCookie(document.cookie)).toBeNull();
    expect(readStoredTheme()).toEqual(LIGHT);
  });

  it("purges cookie and localStorage themes on read", () => {
    window.localStorage.setItem(THEME_KEY, JSON.stringify({
      ...LIGHT,
      revision: THEME_REVISION,
      designId: THEME_DESIGN_ID,
    }));
    document.cookie = `nexus_theme=${encodeURIComponent(JSON.stringify({
      ...LIGHT,
      revision: THEME_REVISION,
      designId: THEME_DESIGN_ID,
    }))}; path=/`;
    expect(readStoredTheme()).toEqual(LIGHT);
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
    expect(readThemeCookie(document.cookie)).toBeNull();
  });

  it("rejects legacy schema-versioned keys instead of restoring old themes", () => {
    window.localStorage.setItem("nexus-theme:v2", JSON.stringify(LIGHT));
    expect(readStoredTheme()).toEqual(DEFAULT_THEME);
    expect(window.localStorage.getItem("nexus-theme:v2")).toBeNull();
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("rejects malformed values and falls back to the default", () => {
    window.localStorage.setItem(THEME_KEY, "{not json");
    expect(readStoredTheme()).toEqual(DEFAULT_THEME);
    expect(normalizeTheme({ mode: "neon" })).toBeNull();
    expect(normalizeTheme({ mode: "light", brand: "bogus", mood: "bogus" })).toBeNull();
    expect(normalizeTheme({ ...LIGHT, revision: THEME_REVISION, designId: "stale-design-id" })).toBeNull();
    expect(normalizeTheme({ ...LIGHT, revision: THEME_REVISION - 1, designId: THEME_DESIGN_ID })).toBeNull();
    expect(normalizeTheme({ mode: "light", brand: "bogus", mood: "bogus", revision: THEME_REVISION, designId: THEME_DESIGN_ID })).toBeNull();
    expect(normalizeTheme({ ...OLD_VARIANT, revision: THEME_REVISION, designId: THEME_DESIGN_ID })).toBeNull();
  });
});
