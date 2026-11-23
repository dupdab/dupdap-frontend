type AuthRedirectHandler = (returnPath?: string) => void;

let authRedirectHandler: AuthRedirectHandler | null = null;

export function setAuthRedirectHandler(handler: AuthRedirectHandler | null) {
  authRedirectHandler = handler;
}

function isSafeReturnPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth/login');
}

export function redirectToLogin(returnPath?: string) {
  const rawPath =
    returnPath ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : undefined);

  const path = rawPath && isSafeReturnPath(rawPath) ? rawPath : undefined;

  // Read the handler at call time so a handler unregistered mid-flight
  // (e.g. AuthRedirectSetup's cleanup on unmount) is never invoked.
  const handler = authRedirectHandler;

  if (handler) {
    handler(path);
    return;
  }

  if (typeof window !== 'undefined') {
    const next = path ? `?next=${encodeURIComponent(path)}` : '';
    window.location.assign(`/auth/login${next}`);
  }
}

/**
 * Validates the `next` query param read on the login page (#761). Only
 * same-origin relative paths are accepted; anything else (absolute URLs,
 * protocol-relative `//host`, backslash tricks, control characters, or a loop
 * back to the login page) falls back to `fallback`.
 */
export function resolveNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  if (next.includes('\\') || /[\u0000-\u001f]/.test(next)) return fallback;
  if (next.startsWith('/auth/login')) return fallback;
  return next;
}
