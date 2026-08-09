/**
 * Sensitive HR / finance fields live in `employee_sensitive_details`, not in
 * `profiles`. Access is restricted by RLS to the employee themselves, HR team
 * members, admins and platform admins.
 */
export const EMPLOYEE_SENSITIVE_FIELDS = [
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relationship",
  "emergency_contact_relation",
  "current_address",
  "address",
  "postal_code",
  "bank_name",
  "bank_account_number",
  "bank_ifsc_code",
  "bank_branch",
  "esi_number",
  "esi_dispensary",
  "pf_number",
  "uan_number",
  "gratuity_nomination_name",
  "gratuity_nomination_relation",
  "gratuity_nomination_percentage",
] as const;

export type EmployeeSensitiveField = (typeof EMPLOYEE_SENSITIVE_FIELDS)[number];

const SENSITIVE_SET = new Set<string>(EMPLOYEE_SENSITIVE_FIELDS as readonly string[]);

/** Split a flat form payload into profile fields and sensitive fields. */
export function splitSensitiveFields<T extends Record<string, unknown>>(
  values: T,
): { profile: Record<string, unknown>; sensitive: Record<string, unknown> } {
  const profile: Record<string, unknown> = {};
  const sensitive: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (SENSITIVE_SET.has(key)) sensitive[key] = value;
    else profile[key] = value;
  }
  return { profile, sensitive };
}

/** Merge a sensitive-details row back onto a profile object for display. */
export function mergeSensitiveDetails<T extends Record<string, unknown>>(
  profile: T | null,
  sensitive: Record<string, unknown> | null | undefined,
): T {
  return { ...(profile ?? ({} as T)), ...(sensitive ?? {}) } as T;
}
