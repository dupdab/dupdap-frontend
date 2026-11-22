import { AxiosError } from 'axios';

/** Shown when a request exceeds the Axios timeout (#800). */
export const TIMEOUT_MESSAGE = 'Request timed out';
/** Shown when no response was received at all. */
export const NETWORK_ERROR_MESSAGE =
  'Network error. Please check your connection and try again.';
/** Last-resort message when nothing better is available. */
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** Every API error is normalized to this shape (#801). */
export interface NormalizedError {
  message: string;
}

const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

/** True when the error is an Axios request timeout. */
export function isTimeoutError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null | undefined;
  if (!e || typeof e !== 'object') return false;
  if (e.code && TIMEOUT_CODES.has(e.code)) return true;
  return typeof e.message === 'string' && /timeout of \d+ms exceeded/i.test(e.message);
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
    for (const item of Object.values(obj)) {
      const found = firstString(item);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Extracts a message from any response body shape the backend returns:
 * `{ message }`, `{ error: string }`, `{ error: { message } }`,
 * `{ errors: [{ message } | string] }`, `{ errors: { field: message } }`,
 * `{ detail }` or a plain string body.
 */
export function messageFromResponseData(data: unknown): string | undefined {
  if (typeof data === 'string') return data.trim() || undefined;
  if (!data || typeof data !== 'object') return undefined;
  const body = data as Record<string, unknown>;
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  if (Array.isArray(body.message)) return firstString(body.message);
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  if (body.error && typeof body.error === 'object') return firstString(body.error);
  if (body.errors) return firstString(body.errors);
  if (typeof body.detail === 'string' && body.detail.trim()) return body.detail;
  return undefined;
}

/**
 * Normalizes any error thrown by an API call to `{ message }` (#801). Used by
 * the Axios response interceptor so every page sees the same shape.
 */
export function normalizeError(err: unknown): NormalizedError {
  if (isTimeoutError(err)) return { message: TIMEOUT_MESSAGE };

  const e = err as
    | { response?: { data?: unknown; status?: number }; message?: unknown }
    | null
    | undefined;
  if (e && typeof e === 'object') {
    if (e.response) {
      const fromBody = messageFromResponseData(e.response.data);
      if (fromBody) return { message: fromBody };
    }
    if (typeof e.message === 'string' && e.message.trim()) {
      return { message: e.message };
    }
    if (!e.response) return { message: NETWORK_ERROR_MESSAGE };
  }
  return { message: GENERIC_ERROR_MESSAGE };
}

/**
 * Extract a human-readable error message from an unknown thrown value. All
 * pages should use this rather than reading `error.response.data` directly.
 */
export function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return normalizeError(err).message;
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
