export type CookieConsent = {
  analytics: boolean;
  marketing: boolean;
  necessary: true;
};

export type StoredConsent = {
  consent: CookieConsent;
  expiresAt: number;
};

const STORAGE_KEY = 'cookie-consent';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const ACCEPT_ALL_CONSENT: CookieConsent = {
  necessary: true,
  analytics: true,
  marketing: true,
};

export const REJECT_ALL_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isValidConsent(value: unknown): value is CookieConsent {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    c.necessary === true &&
    typeof c.analytics === 'boolean' &&
    typeof c.marketing === 'boolean'
  );
}

/**
 * Returns the stored consent if it exists and has not expired, otherwise null.
 * A null result means the banner should be shown (first visit or expired).
 */
export function getStoredConsent(): CookieConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed || typeof parsed.expiresAt !== 'number') return null;
    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (!isValidConsent(parsed.consent)) return null;
    return parsed.consent;
  } catch {
    return null;
  }
}

/**
 * Persists the consent preference in localStorage for one year.
 */
export function saveConsent(consent: CookieConsent): void {
  if (!isBrowser()) return;
  const payload: StoredConsent = {
    consent,
    expiresAt: Date.now() + ONE_YEAR_MS,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

/**
 * Whether the banner should be displayed on this visit.
 */
export function shouldShowBanner(): boolean {
  return getStoredConsent() === null;
}

/**
 * Whether analytics may be loaded, based on stored consent.
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getStoredConsent();
  return consent?.analytics === true;
}

/**
 * Loads analytics only after consent has been granted.
 * The loader is injected by the caller so this module stays dependency-free.
 */
export function loadAnalyticsIfConsented(loader: () => void): void {
  if (hasAnalyticsConsent()) {
    loader();
  }
}
