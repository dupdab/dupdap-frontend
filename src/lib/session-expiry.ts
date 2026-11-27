/** Show the expiry warning this long before the JWT expires (#764). */
export const SESSION_WARNING_MS = 5 * 60 * 1000;

/**
 * Reads the `exp` claim (seconds since epoch) of a JWT and returns it in
 * milliseconds. Returns null for missing, malformed or exp-less tokens.
 * The signature is NOT verified; this is only used for UI timing.
 */
export function getTokenExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export type SessionPhase = 'active' | 'warning' | 'expired';

/** Classifies a session given its expiry time and the current time. */
export function getSessionPhase(expiryMs: number, now: number): SessionPhase {
  const remaining = expiryMs - now;
  if (remaining <= 0) return 'expired';
  if (remaining <= SESSION_WARNING_MS) return 'warning';
  return 'active';
}

/** Formats a remaining duration as m:ss. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
