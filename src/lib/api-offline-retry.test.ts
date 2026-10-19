import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    request: vi.fn(),
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
  redirectToLogin: vi.fn(),
}));

vi.mock('./env', () => ({
  getApiUrl: () => 'http://localhost:3000/api/v1',
}));

interface OfflineRetryError {
  config?: { url?: string; __offlineRetryCount?: number };
  response?: { status: number };
  code?: string;
}

describe('Axios offline retry (#547)', () => {
  let responseErrorHandler: ((err: OfflineRetryError) => Promise<unknown>) | undefined;
  let mockRequest: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    await import('./api');

    const instance = vi.mocked(axios.create).mock.results[0]?.value as unknown as {
      interceptors: { response: { use: ReturnType<typeof vi.fn> } };
      request: ReturnType<typeof vi.fn>;
    };
    responseErrorHandler = vi.mocked(instance.interceptors.response.use).mock
      .calls[0]?.[1] as typeof responseErrorHandler;
    mockRequest = instance.request;
  });

  function setBrowserOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => value,
    });
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  }

  beforeEach(() => {
    mockRequest.mockReset();
    setBrowserOnline(true);
  });

  afterEach(() => {
    setBrowserOnline(true);
  });

  it('holds a network failure while offline, then replays it once online', async () => {
    setBrowserOnline(false);
    const config = { url: '/payments' };
    const response = { data: { payments: [], total: 0 } };
    mockRequest.mockResolvedValue(response);

    const pending = responseErrorHandler!({ config, code: 'ERR_NETWORK' });

    expect(mockRequest).not.toHaveBeenCalled();

    setBrowserOnline(true);

    await expect(pending).resolves.toBe(response);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/payments', __offlineRetryCount: 1 }),
    );
  });

  it('rejects a network failure immediately when the browser is online', async () => {
    const error: OfflineRetryError = {
      config: { url: '/payments' },
      code: 'ERR_NETWORK',
    };

    await expect(responseErrorHandler!(error)).rejects.toBe(error);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not queue the same request more than twice', async () => {
    setBrowserOnline(false);
    const error: OfflineRetryError = {
      config: { url: '/payments', __offlineRetryCount: 2 },
      code: 'ERR_NETWORK',
    };

    await expect(responseErrorHandler!(error)).rejects.toBe(error);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
