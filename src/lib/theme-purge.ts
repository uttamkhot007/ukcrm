const THEME_KEY_FRAGMENTS = ["theme", "color-scheme"];
const EXPLICIT_THEME_KEYS = new Set([
  "nexus_theme",
  "nexus-theme",
  "nexus-theme:v1",
  "nexus-theme:v2",
  "nexus-theme:v3",
  "nexus-theme:v4",
  "app-theme-config",
]);

function isThemeStorageKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (EXPLICIT_THEME_KEYS.has(normalized)) return true;
  return THEME_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export type ThemePurgeStatus = "ok" | "failed" | "unsupported";

export interface ThemePurgeReport {
  localStorage: ThemePurgeStatus;
  sessionStorage: ThemePurgeStatus;
  cookies: ThemePurgeStatus;
  indexedDB: ThemePurgeStatus;
  removed: string[];
  remaining: string[];
}

function purgeThemeKeysFromStorage(
  storage: Storage | null | undefined,
  removed: string[],
): ThemePurgeStatus {
  if (!storage) return "unsupported";
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (isThemeStorageKey(key)) keys.push(key);
    }
    keys.forEach((key) => {
      storage.removeItem(key);
      removed.push(key);
    });
    return "ok";
  } catch {
    /* storage access can be blocked by browser privacy settings */
    return "failed";
  }
}


function purgeThemeCookies(removed: string[]): ThemePurgeStatus {
  if (typeof document === "undefined") return "unsupported";
  try {
    document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim())
      .filter(isThemeStorageKey)
      .forEach((name) => {
        const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
        const encoded = encodeURIComponent(name);
        document.cookie = `${encoded}=; path=/; max-age=0; SameSite=Lax${secure}`;
        document.cookie = `${encoded}=; max-age=0; SameSite=Lax${secure}`;
        removed.push(`cookie:${name}`);
      });
    return "ok";
  } catch {
    /* ignore cookie failures */
    return "failed";
  }
}


function deleteDatabase(factory: IDBFactory, name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = factory.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = factory.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function clearStore(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function deleteThemeRecords(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }
        if (isThemeStorageKey(String(cursor.key))) {
          try { cursor.delete(); } catch { /* ignore single-record failure */ }
        }
        cursor.continue();
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function purgeThemeIndexedDb(removed: string[]): Promise<ThemePurgeStatus> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return "unsupported";
  const factory = window.indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string | null }>>;
  };
  if (!factory.databases) return "unsupported";

  try {
    const databases = await factory.databases();
    for (const info of databases) {
      const name = info.name;
      if (!name) continue;
      if (isThemeStorageKey(name)) {
        await deleteDatabase(factory, name);
        removed.push(`idb:${name}`);
        continue;
      }

      const db = await openDatabase(factory, name);
      if (!db) continue;
      try {
        const stores = Array.from(db.objectStoreNames);
        for (const storeName of stores) {
          try {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            if (isThemeStorageKey(storeName)) {
              await clearStore(store);
              removed.push(`idb:${name}/${storeName}`);
            } else {
              await deleteThemeRecords(store);
            }
          } catch {
            /* ignore stores that cannot be opened read/write */
          }
        }
      } finally {
        db.close();
      }
    }
    return "ok";
  } catch {
    /* IndexedDB enumeration is best-effort and unsupported in some browsers. */
    return "failed";
  }
}

function collectRemainingThemeKeys(): string[] {
  const remaining: string[] = [];
  if (typeof window === "undefined") return remaining;
  const scan = (storage: Storage | null | undefined, label: string) => {
    if (!storage) return;
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (isThemeStorageKey(key)) remaining.push(`${label}:${key}`);
      }
    } catch {
      /* ignore */
    }
  };
  scan(window.localStorage, "localStorage");
  scan(window.sessionStorage, "sessionStorage");
  try {
    document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim())
      .filter(isThemeStorageKey)
      .forEach((name) => remaining.push(`cookie:${name}`));
  } catch {
    /* ignore */
  }
  return remaining;
}

export function purgeThemeStorageSync(): ThemePurgeReport {
  const removed: string[] = [];
  if (typeof window === "undefined") {
    return {
      localStorage: "unsupported",
      sessionStorage: "unsupported",
      cookies: "unsupported",
      indexedDB: "unsupported",
      removed,
      remaining: [],
    };
  }
  const report: ThemePurgeReport = {
    localStorage: purgeThemeKeysFromStorage(window.localStorage, removed),
    sessionStorage: purgeThemeKeysFromStorage(window.sessionStorage, removed),
    cookies: purgeThemeCookies(removed),
    indexedDB: "unsupported",
    removed,
    remaining: [],
  };
  report.remaining = collectRemainingThemeKeys();
  return report;
}

function logThemePurgeReport(report: ThemePurgeReport): void {
  const failed = (["localStorage", "sessionStorage", "cookies", "indexedDB"] as const).filter(
    (key) => report[key] === "failed",
  );
  const summary = {
    localStorage: report.localStorage,
    sessionStorage: report.sessionStorage,
    cookies: report.cookies,
    indexedDB: report.indexedDB,
    removedKeys: report.removed,
    remainingThemeKeys: report.remaining,
  };
  const prefix = "[theme-purge] boot purge";
  if (failed.length > 0 || report.remaining.length > 0) {
    console.warn(`${prefix} incomplete`, summary);
  } else {
    console.info(`${prefix} ok`, summary);
  }
}

export async function purgeThemeStorageBeforeBoot(): Promise<ThemePurgeReport> {
  purgeThemeStorageSync();
  const removed: string[] = [];
  const indexedDB = await purgeThemeIndexedDb(removed);
  const report = purgeThemeStorageSync();
  report.indexedDB = indexedDB;
  report.removed = [...removed, ...report.removed];
  try {
    document.documentElement.setAttribute("data-theme-purged", "1");
  } catch {
    /* ignore */
  }
  logThemePurgeReport(report);
  return report;
}

}
