/** Presentation-state schema. Bump when navigation or theme shapes change. */
export const UI_STATE_SCHEMA_VERSION = "3";
export const UI_STATE_PREFIX = `nexus-ui-state:v${UI_STATE_SCHEMA_VERSION}:`;
/**
 * @deprecated Legacy, schema-versioned theme key. The live key is the stable
 * `THEME_KEY` in `@/lib/theme-storage` — versioning this key made every schema
 * bump reset the user's theme. Kept only so old values can be migrated.
 */
export const THEME_STORAGE_KEY = `nexus-theme:v${UI_STATE_SCHEMA_VERSION}`;

const LEGACY_PRESENTATION_KEYS = ["dashboard-widget-order"];

/** Device-level keys that survive every purge and sign-out. */
const PRESERVED_KEYS = ["nexus-theme"];

/** Remove only obsolete presentation state. Auth/session storage is untouched. */
export function purgeObsoletePresentationState(storage: Storage): string[] {
  const removed: string[] = [];
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }

  for (const key of keys) {
    if (PRESERVED_KEYS.includes(key)) continue;
    const isLegacyUiState = key.startsWith("nexus-ui-state:") && !key.startsWith(UI_STATE_PREFIX);
    if (isLegacyUiState || LEGACY_PRESENTATION_KEYS.includes(key)) {
      storage.removeItem(key);
      removed.push(key);
    }
  }
  return removed;
}