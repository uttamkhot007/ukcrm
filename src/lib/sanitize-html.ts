import DOMPurify from "dompurify";

/**
 * Sanitize database-sourced HTML before rendering it with
 * dangerouslySetInnerHTML. Blocks stored XSS payloads (scripts, event
 * handlers, javascript: URLs, embedded objects).
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style", "srcdoc", "formaction"],
  });
}
