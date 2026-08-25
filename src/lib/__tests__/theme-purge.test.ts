// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { purgeThemeStorageSync } from "@/lib/theme-purge";

describe("theme storage purge", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = "nexus_theme=; path=/; max-age=0";
    document.cookie = "legacy_theme=; path=/; max-age=0";
  });

  it("removes theme-related keys from localStorage, sessionStorage and cookies", () => {
    window.localStorage.setItem("nexus-theme", "old");
    window.localStorage.setItem("tenant_theme_override", "old");
    window.localStorage.setItem("tenant_id", "safe");
    window.sessionStorage.setItem("color-scheme", "dark");
    window.sessionStorage.setItem("nexus:release-coherence", "safe");
    document.cookie = "nexus_theme=old; path=/";
    document.cookie = "legacy_theme=old; path=/";

    purgeThemeStorageSync();

    expect(window.localStorage.getItem("nexus-theme")).toBeNull();
    expect(window.localStorage.getItem("tenant_theme_override")).toBeNull();
    expect(window.localStorage.getItem("tenant_id")).toBe("safe");
    expect(window.sessionStorage.getItem("color-scheme")).toBeNull();
    expect(window.sessionStorage.getItem("nexus:release-coherence")).toBe("safe");
    expect(document.cookie).not.toContain("nexus_theme");
    expect(document.cookie).not.toContain("legacy_theme");
  });
});