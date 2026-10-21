const CSRF_COOKIE_NAME = 'csrf_token';

/** Reads the API-provided double-submit CSRF token from the browser cookie. */
export function getCsrfToken(cookieHeader?: string): string | undefined {
  const cookieString =
    cookieHeader ?? (typeof document === 'undefined' ? '' : document.cookie);
  const cookie = cookieString
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!cookie) return undefined;
  const value = cookie.slice(CSRF_COOKIE_NAME.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isMutationMethod(method?: string): boolean {
  return Boolean(
    method && !['get', 'head', 'options'].includes(method.toLowerCase())
  );
}
