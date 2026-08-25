import { beforeEach, describe, expect, it } from "vitest";
import {
  purgeObsoletePresentationState,
  UI_STATE_PREFIX,
} from "@/lib/ui-persistence";
import { THEME_KEY } from "@/lib/theme-storage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("presentation persistence migration", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("removes obsolete UI keys without touching auth or current state", () => {
    storage.setItem("nexus-ui-state:legacy:tabs", "old");
    storage.setItem("dashboard-widget-order", "old");
    storage.setItem(`${UI_STATE_PREFIX}tabs`, "current");
    storage.setItem("auth-token", "secret");

    const removed = purgeObsoletePresentationState(storage);

    expect(removed).toEqual(expect.arrayContaining([
      "nexus-ui-state:legacy:tabs",
      "dashboard-widget-order",
    ]));
    expect(storage.getItem(`${UI_STATE_PREFIX}tabs`)).toBe("current");
    expect(storage.getItem("auth-token")).toBe("secret");
  });

  it("purges stale device theme keys so old visual systems cannot return", () => {
    storage.setItem(THEME_KEY, JSON.stringify({ mode: "light", brand: "emerald", mood: "default" }));
    const removed = purgeObsoletePresentationState(storage);
    expect(removed).toContain(THEME_KEY);
    expect(storage.getItem(THEME_KEY)).toBeNull();
  });
});
