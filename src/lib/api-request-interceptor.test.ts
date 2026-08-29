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

describe('Axios request interceptor', () => {
  let requestInterceptor: ((config: { headers: Record<string, string> }) => { headers: Record<string, string> }) | undefined;

  beforeAll(async () => {
    await import('./api');

    const instance = vi.mocked(axios.create).mock.results[0]?.value;
    requestInterceptor = vi.mocked(instance.interceptors.request.use).mock.calls[0]?.[0];
  });

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, merchant: null });
  });

  it('adds Authorization header with Bearer token when token is present', () => {
    useAuthStore.setState({ token: 'test-jwt-token', merchant: null });

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor?.(config);

    expect(result?.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('does not add Authorization header when token is absent', () => {
    useAuthStore.setState({ token: null, merchant: null });

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor?.(config);

    expect(result?.headers.Authorization).toBeUndefined();
  });

  it('does not overwrite other headers already on the config', () => {
    useAuthStore.setState({ token: 'my-token', merchant: null });

    const config = {
      headers: { 'Content-Type': 'application/json' } as Record<string, string>,
    };
    const result = requestInterceptor?.(config);

    expect(result?.headers['Content-Type']).toBe('application/json');
    expect(result?.headers.Authorization).toBe('Bearer my-token');
  });

  it('returns the config object', () => {
    useAuthStore.setState({ token: null, merchant: null });

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor?.(config);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('headers');
  });

  it('reads the token from the store, not from localStorage directly', () => {
    // Put a token in localStorage under the legacy key but not in the store
    localStorage.setItem('access_token', 'legacy-token');
    useAuthStore.setState({ token: null, merchant: null });

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor?.(config);

    // Should NOT pick up the legacy localStorage token
    expect(result?.headers.Authorization).toBeUndefined();
  });

  it('uses the current store token at call time, not a stale closure', () => {
    useAuthStore.setState({ token: 'first-token', merchant: null });

    const config1 = { headers: {} as Record<string, string> };
    const result1 = requestInterceptor?.(config1);
    expect(result1?.headers.Authorization).toBe('Bearer first-token');

    // Update token
    useAuthStore.setState({ token: 'second-token' });

    const config2 = { headers: {} as Record<string, string> };
    const result2 = requestInterceptor?.(config2);
    expect(result2?.headers.Authorization).toBe('Bearer second-token');
  });
});
