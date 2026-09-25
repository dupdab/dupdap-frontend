import { AxiosError } from 'axios';

/** Extract a human-readable error message from an unknown thrown value. */
export function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return undefined;
}

/**
 * Type guard narrowing an unknown thrown value to an AxiosError so callers can
 * safely access Axios-specific properties like `response` and `response.status`.
 */
export function isAxiosError(err: unknown): err is AxiosError {
  return err instanceof AxiosError;
}

/** Number of failed login attempts before a CAPTCHA challenge is shown. */
export const CAPTCHA_THRESHOLD = 3;

/**
 * Build a user-facing message for rate-limit (HTTP 429) responses.
 * Returns undefined when the error is not a rate-limit error.
 */
export function getRateLimitMessage(err: unknown): string | undefined {
  if (err instanceof AxiosError && err.response?.status === 429) {
    const retryAfter = err.response.headers?.['retry-after'];
    if (retryAfter) {
      return `Too many attempts. Please try again in ${retryAfter} seconds.`;
    }
    return 'Too many attempts. Please try again later.';
  }
  return undefined;
}
