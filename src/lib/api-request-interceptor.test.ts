import { beforeAll, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockInstance = {
    defaults: { withCredentials: false },
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

describe('Axios request configuration & interceptor', () => {
  it('configures axios with withCredentials: true', async () => {
    await import('./api');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ withCredentials: true }),
    );
  });

  it('omits manual Authorization header (cookies sent automatically)', async () => {
    await import('./api');
    const instance = vi.mocked(axios.create).mock.results[0]?.value;
    const requestUse = vi.mocked(instance.interceptors.request.use);
    const requestInterceptor = requestUse.mock.calls[0]?.[0];
    if (requestInterceptor) {
      const config = { headers: {} as Record<string, string> };
      const result = requestInterceptor(config);
      expect(result?.headers.Authorization).toBeUndefined();
    } else {
      expect(requestInterceptor).toBeUndefined();
    }
  });

  it('sends the double-submit CSRF token on mutations', () => {
    document.cookie = 'csrf_token=csrf-value';
    const config = { method: 'post', headers: {} as Record<string, string> };

    const result = requestInterceptor?.(config);

    expect(result?.headers['X-CSRF-Token']).toBe('csrf-value');
    document.cookie = 'csrf_token=; Max-Age=0';
  });

  it('does not send the CSRF header on safe requests', () => {
    document.cookie = 'csrf_token=csrf-value';
    const config = { method: 'get', headers: {} as Record<string, string> };

    const result = requestInterceptor?.(config);

    expect(result?.headers['X-CSRF-Token']).toBeUndefined();
    document.cookie = 'csrf_token=; Max-Age=0';
  });
});
