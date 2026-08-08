/**
 * In-memory auth token store.
 *
 * Security: access/refresh tokens are deliberately NOT persisted to
 * localStorage or sessionStorage. Anything written there is readable by any
 * JavaScript on the page, so a single XSS bug would allow silent token
 * exfiltration and full account takeover. Keeping tokens in a module-level
 * variable means they live only for the lifetime of the page, and the refresh
 * flow / re-authentication restores the session after a reload.
 */

export interface AuthTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

const LEGACY_KEYS = [
  "nexuscrm_access_token",
  "nexuscrm_refresh_token",
  "nexuscrm_token_expires",
];

/** Remove tokens previously persisted by older builds. */
function purgeLegacyPersistedTokens() {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

purgeLegacyPersistedTokens();

let accessToken: string | null = null;
let idToken: string | null = null;
let refreshToken: string | null = null;
let expiresAt = 0;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  getIdToken(): string | null {
    return idToken;
  },
  getRefreshToken(): string | null {
    return refreshToken;
  },
  getExpiresAt(): number {
    return expiresAt;
  },
  set(t: AuthTokens) {
    accessToken = t.accessToken;
    if (t.idToken) idToken = t.idToken;
    if (t.refreshToken) refreshToken = t.refreshToken;
    expiresAt = Date.now() + (t.expiresIn ?? 3600) * 1000;
    purgeLegacyPersistedTokens();
  },
  clear() {
    accessToken = null;
    idToken = null;
    refreshToken = null;
    expiresAt = 0;
    purgeLegacyPersistedTokens();
  },
  isExpired(): boolean {
    return !expiresAt || Date.now() >= expiresAt;
  },
};
