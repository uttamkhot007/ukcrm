import { beforeEach, describe, expect, it } from "vitest";
import {
  purgeObsoletePresentationState,
  THEME_STORAGE_KEY,
  UI_STATE_PREFIX,
} from "@/lib/ui-persistence";

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
    storage.setItem("app-theme-config", "old");
    storage.setItem("dashboard-widget-order", "old");
    storage.setItem(`${UI_STATE_PREFIX}tabs`, "current");
    storage.setItem(THEME_STORAGE_KEY, "current-theme");
    storage.setItem("auth-token", "secret");

    const removed = purgeObsoletePresentationState(storage);

    expect(removed).toEqual(expect.arrayContaining([
      "nexus-ui-state:legacy:tabs",
      "app-theme-config",
      "dashboard-widget-order",
    ]));
    expect(storage.getItem(`${UI_STATE_PREFIX}tabs`)).toBe("current");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("current-theme");
    expect(storage.getItem("auth-token")).toBe("secret");
  });
});