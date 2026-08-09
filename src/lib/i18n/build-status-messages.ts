/**
 * Localization-ready strings for the build/version indicator and the
 * stale-build banner.
 *
 * The app does not ship an i18n runtime yet, so this module is deliberately
 * dependency-free: every user-visible string lives in one catalog keyed by
 * locale, with ICU-style `{placeholder}` interpolation. Adding a language is
 * a matter of adding one entry to `CATALOGS`; swapping in i18next later only
 * requires replacing `t()` — no component changes.
 */

export type BuildStatusMessageKey =
  | "status.stale"
  | "status.fresh"
  | "status.sameOrigin"
  | "status.unknown"
  | "status.checking"
  | "label.buildVersion"
  | "label.liveBuild"
  | "label.publishHint"
  | "action.recheck"
  | "action.recheckLive"
  | "action.proceedAnyway"
  | "banner.title"
  | "banner.blocked"
  | "banner.overridden"
  | "region.buildStatus"
  | "region.staleBanner"
  | "relative.minutes"
  | "relative.hours"
  | "relative.days"
  | "relative.unknown";

type Catalog = Record<BuildStatusMessageKey, string>;

const en: Catalog = {
  "status.stale": "Live site is outdated ({behind})",
  "status.fresh": "Live site matches this build",
  "status.sameOrigin": "You are on the live site",
  "status.unknown": "Live build not verified",
  "status.checking": "Checking the live build…",
  "label.buildVersion": "Version {version}, built {time}, commit {commit}",
  "label.liveBuild": "live: {time}",
  "label.publishHint": "Publish → Update before trusting {url}",
  "action.recheck": "Re-check",
  "action.recheckLive": "Re-check live build",
  "action.proceedAnyway": "Proceed anyway",
  "banner.title": "Live site is outdated ({behind})",
  "banner.blocked":
    "Tenant edits and other risky actions are disabled. Publish → Update, then re-check {url}.",
  "banner.overridden":
    "Override active — risky actions are enabled for this session despite the mismatch.",
  "region.buildStatus": "Build and deployment status",
  "region.staleBanner": "Outdated live site warning",
  "relative.minutes": "{count} min behind",
  "relative.hours": "{count} h behind",
  "relative.days": "{count} d behind",
  "relative.unknown": "unknown",
};

const CATALOGS: Record<string, Catalog> = { en };

function resolveLocale(): string {
  try {
    const lang = document.documentElement.lang || navigator.language || "en";
    const base = lang.toLowerCase().split("-")[0];
    return CATALOGS[base] ? base : "en";
  } catch {
    return "en";
  }
}

/** Translate a key, interpolating `{placeholders}`. */
export function t(
  key: BuildStatusMessageKey,
  vars: Record<string, string | number> = {},
): string {
  const catalog = CATALOGS[resolveLocale()] ?? en;
  const template = catalog[key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** Locale-aware date/time for build timestamps. */
export function formatBuildTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(resolveLocale(), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Localized "N min behind" phrasing for the live-build lag. */
export function formatBehindLocalized(behindMs: number | null): string {
  if (behindMs === null) return t("relative.unknown");
  const mins = Math.round(behindMs / 60000);
  if (mins < 60) return t("relative.minutes", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 48) return t("relative.hours", { count: hours });
  return t("relative.days", { count: Math.round(hours / 24) });
}
