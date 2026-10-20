import axios from 'axios';
import { getApiUrl } from './env';
import { useAuthStore } from './store';
import { redirectToLogin } from './auth-redirect';
import type {
  AuthResponse,
  Merchant,
  Payment,
  PaymentListResponse,
  PaymentStats,
  SettlementListResponse,
  Settlement,
  Webhook,
  ApiKey,
} from './types';

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
});

/** Extra config field used to bound reconnect retries for one request. */
interface OfflineRetryConfig {
  __offlineRetryCount?: number;
  /** Tracks how many 5xx / network-error retries have been attempted. */
  __serverRetryCount?: number;
}

const MAX_OFFLINE_RETRIES = 2;

/**
 * Maximum number of automatic retries for 5xx responses and transient network
 * errors while the browser is online. Kept low so we don't flood a struggling
 * backend; exponential back-off spreads the load further.
 */
const MAX_SERVER_RETRIES = 3;

/** Initial delay (ms) before the first server-error retry. Doubles each attempt. */
const SERVER_RETRY_BASE_MS = 500;

/** HTTP methods safe to retry automatically (idempotent reads + payment status polling). */
const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);

function isRetryable5xx(status: number): boolean {
  // 503 Service Unavailable and 502/504 gateway errors are transient by
  // definition. Retry 500 as well — backend blips during settlement processing
  // are common and a single retry is low-risk for read endpoints.
  return status >= 500 && status <= 599;
}

function serverRetryDelay(attempt: number): number {
  return Math.min(SERVER_RETRY_BASE_MS * 2 ** attempt, 30_000);
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

    // Retry idempotent requests (GET, HEAD, OPTIONS) on 5xx responses or
    // transient network errors while the browser is online. Exponential
    // back-off reduces load on a struggling backend (#retry-5xx).
    const serverRetries = config?.__serverRetryCount ?? 0;
    const method = config?.method?.toLowerCase() ?? '';
    const is5xx = err.response ? isRetryable5xx(err.response.status) : false;
    const isNetworkError = !err.response && !isOffline();
    if (
      config &&
      RETRYABLE_METHODS.has(method) &&
      (is5xx || isNetworkError) &&
      serverRetries < MAX_SERVER_RETRIES
    ) {
      config.__serverRetryCount = serverRetries + 1;
      const delay = serverRetryDelay(serverRetries);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api.request(config);
    }

    return Promise.reject(err);
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
  list: (page = 1, limit = 20) =>
    api.get<PaymentListResponse>(`/payments?page=${page}&limit=${limit}`),
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  stats: () => api.get<PaymentStats[]>('/payments/stats'),
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
