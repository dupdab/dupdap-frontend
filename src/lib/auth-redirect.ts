type AuthRedirectHandler = (returnPath?: string) => void;

let authRedirectHandler: AuthRedirectHandler | null = null;

export function setAuthRedirectHandler(handler: AuthRedirectHandler | null) {
  authRedirectHandler = handler;
}

export function redirectToLogin(returnPath?: string) {
  const path =
    returnPath ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : undefined);

  if (authRedirectHandler) {
    authRedirectHandler(path);
    return;
  }

  if (typeof window !== 'undefined') {
    const next = path ? `?next=${encodeURIComponent(path)}` : '';
    window.location.assign(`/auth/login${next}`);
  }
}
