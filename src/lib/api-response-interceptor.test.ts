import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { useAuthStore } from './store';

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

vi.mock('./auth-redirect', () => ({
  redirectToLogin: vi.fn((returnPath?: string) => {
    const rawPath =
      returnPath ??
      (typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : undefined);
    const path = rawPath && rawPath.startsWith('/') && !rawPath.startsWith('//')
      ? rawPath
      : undefined;
    window.location.assign(`/auth/login${path ? `?next=${encodeURIComponent(path)}` : ''}`);
  }),
  setAuthRedirectHandler: vi.fn(),
}));

import { redirectToLogin } from './auth-redirect';

vi.mock('./env', () => ({
  getApiUrl: vi.fn(() => 'http://localhost:3000/api/v1'),
}));

describe('Axios 401 response interceptor', () => {
  let responseErrorHandler: ((err: { response?: { status: number } }) => Promise<never>) | undefined;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
    (globalThis as unknown as { getApiUrl: () => string }).getApiUrl = () => 'http://localhost:3000/api/v1';
    await import('./api');

    const instance = vi.mocked(axios.create).mock.results[0]?.value;
    responseErrorHandler = vi.mocked(instance.interceptors.response.use).mock.calls[0]?.[1];
  });

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      merchant: { id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active' },
    });

    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        pathname: '/dashboard',
        search: '',
        assign: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  it('clears auth state on a 401 response', async () => {
    const err = { response: { status: 401 } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(useAuthStore.getState().merchant).toBeNull();
  });

  it('calls redirectToLogin() with the current path preserved on a 401 response', async () => {
    const { redirectToLogin } = await import('./auth-redirect');
    vi.mocked(redirectToLogin).mockClear();

    const err = { response: { status: 401 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(redirectToLogin).toHaveBeenCalledWith('/dashboard');
  });

  it('does not clear auth state on a non-401 error (e.g. 403)', async () => {
    const err = { response: { status: 403 } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(useAuthStore.getState().merchant).not.toBeNull();
  });

  it('does not redirect on a non-401 error (e.g. 500)', async () => {
    const err = { response: { status: 500 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('passes through the original error on rejection for 401', async () => {
    const err = { response: { status: 401 }, message: 'Unauthorized' };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);
  });

  it('handles errors with no response property gracefully', async () => {
    const err = {} as { response?: { status: number } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(useAuthStore.getState().merchant).not.toBeNull();
  });
});
