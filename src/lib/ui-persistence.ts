/** Presentation-state schema. Bump when navigation state shapes change. */
export const UI_STATE_SCHEMA_VERSION = "3";
export const UI_STATE_PREFIX = `nexus-ui-state:v${UI_STATE_SCHEMA_VERSION}:`;
/**
 * @deprecated Legacy, schema-versioned theme key. Current theme values are
 * design-revisioned in `@/lib/theme-storage`; old theme keys are purged.
 */
export const THEME_STORAGE_KEY = `nexus-theme:v${UI_STATE_SCHEMA_VERSION}`;

const LEGACY_PRESENTATION_KEYS = [
  "dashboard-widget-order",
  "nexus-theme",
  "nexus-theme:v1",
  "nexus-theme:v2",
  "nexus-theme:v3",
  "nexus-theme:v4",
  THEME_STORAGE_KEY,
  "app-theme-config",
];

/** Device-level keys that survive presentation purges. */
const PRESERVED_KEYS: string[] = [];

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