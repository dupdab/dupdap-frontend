import axios, { type AxiosRequestConfig } from 'axios';

import { redirectToLogin } from './auth-redirect';
import { getApiUrl } from './env';
import { normalizeError, type NormalizedError } from './errors';
import { useAuthStore } from './store';

import type {
  AuthResponse,
  Merchant,
  Payment,
  PaymentListResponse,
  PaymentStats,
  SettlementListResponse,
  Settlement,
  TopMerchant,
  Webhook,
  ApiKey,
} from './types';

/** Requests that take longer than this fail with 'Request timed out' (#800). */
export const REQUEST_TIMEOUT_MS = 30_000;

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

/** Extra config field used to bound reconnect retries for one request. */
interface OfflineRetryConfig {
  __offlineRetryCount?: number;
  /** Tracks how many 5xx / network-error retries have been attempted. */
  __serverRetryCount?: number;
}

const MAX_OFFLINE_RETRIES = 2;

/**
 * Maximum number of automatic retries for transient failures (502, 503 and
 * network timeouts) while the browser is online (#802).
 */
export const MAX_SERVER_RETRIES = 2;

/** Exponential back-off before each retry: 1s, then 3s (#802). */
export const SERVER_RETRY_DELAYS_MS = [1_000, 3_000];

/** HTTP methods safe to retry automatically (idempotent reads + payment status polling). */
const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);

/**
 * Only gateway/availability errors are transient. Client errors such as 400,
 * 401, 403, 404 and 422 are never retried (#802).
 */
const RETRYABLE_STATUSES = new Set([502, 503]);

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

function serverRetryDelay(attempt: number): number {
  return SERVER_RETRY_DELAYS_MS[Math.min(attempt, SERVER_RETRY_DELAYS_MS.length - 1)];
}

/**
 * Attaches the normalized `{ message }` shape to a rejected error so every
 * caller sees the same thing (#801). The original error object is kept so
 * status codes and response bodies remain available.
 */
function normalizeRejection<T>(err: T): T {
  if (err && typeof err === 'object') {
    const normalized: NormalizedError = normalizeError(err);
    const target = err as unknown as { message?: string; normalized?: NormalizedError };
    target.normalized = normalized;
    try {
      target.message = normalized.message;
    } catch {
      // message may be read-only on exotic error objects; normalized is still set
    }
  }
  return err;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Resolves as soon as the browser reports a connection again. Requests that
 * fail while offline await this instead of rejecting, so the caller's original
 * promise settles once the request is replayed (#547).
 */
function waitForOnline(): Promise<void> {
  if (!isOffline()) return Promise.resolve();

  return new Promise((resolve) => {
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };
    window.addEventListener('online', handleOnline);
  });
}

// Request interceptor omitted: auth token is sent automatically via httpOnly cookie (withCredentials: true).

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      // Preserve the page the user was on so they land back there after signing in.
      const returnPath = `${window.location.pathname}${window.location.search}`;
      redirectToLogin(returnPath);
    }

    // A network failure while offline is queued until the connection returns
    // and then replayed through the same axios instance, so awaiting callers
    // receive the real response and can render fresh data automatically (#547).
    const config = err.config as
      (typeof err.config & OfflineRetryConfig) | undefined;
    const retryCount = config?.__offlineRetryCount ?? 0;
    if (
      config &&
      !err.response &&
      isOffline() &&
      retryCount < MAX_OFFLINE_RETRIES
    ) {
      config.__offlineRetryCount = retryCount + 1;
      await waitForOnline();
      return api.request(config);
    }

    // Retry idempotent requests (GET, HEAD, OPTIONS) on 502/503 responses and
    // network timeouts / transient network errors while the browser is online,
    // up to 2 times with 1s then 3s back-off (#802).
    const serverRetries = config?.__serverRetryCount ?? 0;
    const method = config?.method?.toLowerCase() ?? '';
    const isRetryableResponse = err.response
      ? isRetryableStatus(err.response.status)
      : false;
    // No response at all: a network timeout (ECONNABORTED/ETIMEDOUT) or a
    // dropped connection while online.
    const isNetworkError = !err.response && !isOffline();
    if (
      config &&
      RETRYABLE_METHODS.has(method) &&
      (isRetryableResponse || isNetworkError) &&
      serverRetries < MAX_SERVER_RETRIES
    ) {
      config.__serverRetryCount = serverRetries + 1;
      const delay = serverRetryDelay(serverRetries);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api.request(config);
    }

    return Promise.reject(normalizeRejection(err));
  }
);

export default api;
export { api };

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    businessName: string;
    country?: string;
  }) => api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
};

export const paymentsApi = {
  create: (data: {
    amountUsd: number;
    description?: string;
    customerEmail?: string;
    expiryMinutes?: number;
  }) => api.post<Payment>('/payments', data),
  /**
   * Accepts an optional axios config so callers can pass an AbortSignal for
   * cancellable in-flight requests (React Query request deduplication).
   */
  list: (
    page = 1,
    limit = 20,
    config?: AxiosRequestConfig,
    status?: string
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status) params.set('status', status);
    return api.get<PaymentListResponse>(`/payments?${params.toString()}`, config);
  },
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  stats: (config?: AxiosRequestConfig) =>
    api.get<PaymentStats[]>('/payments/stats', config),
  topMerchants: (range?: string) =>
    api.get<TopMerchant[]>(
      `/payments/top-merchants${range ? `?range=${range}` : ''}`
    ),
  getByReference: (ref: string) => api.get<Payment>(`/pay/${ref}`),
};

export const settlementsApi = {
  list: (page = 1, limit = 20) =>
    api.get(`/settlements?page=${page}&limit=${limit}`),
  get: (id: string) => api.get<Settlement>(`/settlements/${id}`),
};

export const merchantApi = {
  profile: () => api.get<Merchant>('/merchants/me'),
  update: (data: Record<string, string>) =>
    api.patch<Merchant>('/merchants/me', data),
  generateApiKey: (scopes?: string[]) =>
    api.post<ApiKey>('/merchants/api-keys', { scopes }),
  rateLimit: () => api.get('/merchants/api-keys/rate-limit'),
};

export const webhooksApi = {
  list: () => api.get<Webhook[]>('/webhooks'),
  create: (data: { url: string; events: string[]; secret?: string }) =>
    api.post<Webhook>('/webhooks', data),
  rotateSecret: (id: string) =>
    api.post<Webhook>(`/webhooks/${id}/rotate-secret`, {}),
  remove: (id: string) => api.delete(`/webhooks/${id}`),
};

export const adminApi = {
  listSettlements: (query = '') =>
    api.get(`/admin/settlements${query ? `?${query}` : ''}`),
  retrySettlement: (id: string) =>
    api.post(`/admin/settlements/${id}/retry`, {}),
  approveSettlement: (id: string) =>
    api.post(`/admin/settlements/${id}/approve`, {}),
};

export const waitlistApi = {
  join: (data: {
    email: string;
    username?: string;
    businessName?: string;
    country?: string;
  }) => api.post('/waitlist/join', data),
  checkUsername: (username: string) => api.get(`/waitlist/check/${username}`),
  stats: () => api.get('/waitlist/stats'),
};
