import axios from 'axios';
import type {
  AuthResponse,
  Merchant,
  Payment,
  PaymentListResponse,
  PaymentStats,
  SettlementListResponse,
  Webhook,
  ApiKey,
} from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  },
);

export default api;
export { api };

export const authApi = {
  register: (data: { email: string; password: string; businessName: string; country?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', data),
};

export const paymentsApi = {
  create: (data: { amountUsd: number; description?: string; customerEmail?: string; expiryMinutes?: number }) =>
    api.post<Payment>('/payments', data),
  list: (page = 1, limit = 20) => api.get<PaymentListResponse>(`/payments?page=${page}&limit=${limit}`),
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  stats: () => api.get<PaymentStats[]>('/payments/stats'),
  getByReference: (ref: string) => api.get<Payment>(`/pay/${ref}`),
};

export const settlementsApi = {
  list: (page = 1, limit = 20) => api.get(`/settlements?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/settlements/${id}`),
};

export const merchantApi = {
  profile: () => api.get<Merchant>('/merchants/me'),
  update: (data: Record<string, string>) => api.patch<Merchant>('/merchants/me', data),
  generateApiKey: (scopes?: string[]) => api.post<ApiKey>('/merchants/api-keys', { scopes }),
};

export const webhooksApi = {
  list: () => api.get<Webhook[]>('/webhooks'),
  create: (data: { url: string; events: string[]; secret?: string }) => api.post<Webhook>('/webhooks', data),
  remove: (id: string) => api.delete(`/webhooks/${id}`),
};

export const adminApi = {
  listSettlements: (query = '') =>
    api.get(`/admin/settlements${query ? `?${query}` : ''}`),
  retrySettlement: (id: string) => api.post(`/admin/settlements/${id}/retry`, {}),
  approveSettlement: (id: string) => api.post(`/admin/settlements/${id}/approve`, {}),
};

export const waitlistApi = {
  join: (data: { email: string; username?: string; businessName?: string; country?: string }) =>
    api.post('/waitlist/join', data),
  checkUsername: (username: string) => api.get(`/waitlist/check/${username}`),
  stats: () => api.get('/waitlist/stats'),
};