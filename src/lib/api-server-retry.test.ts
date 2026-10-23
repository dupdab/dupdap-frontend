import axios from 'axios';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

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
  return { default: { create: vi.fn(() => mockInstance) } };
});

vi.mock('./auth-redirect', () => ({ redirectToLogin: vi.fn() }));
vi.mock('./env', () => ({ getApiUrl: () => 'http://localhost:3000/api/v1' }));

// Speed up retry delays so tests don't wait for real timers.
vi.useFakeTimers();

interface RetryError {
  config?: {
    url?: string;
    method?: string;
    __offlineRetryCount?: number;
    __serverRetryCount?: number;
  };
  response?: { status: number };
  code?: string;
}

describe('Axios 5xx / network retry logic', () => {
  let responseErrorHandler: ((err: RetryError) => Promise<unknown>) | undefined;
  let mockRequest: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    await import('./api');
    const instance = vi.mocked(axios.create).mock.results[0]
      ?.value as unknown as {
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
  }

  beforeEach(() => {
    mockRequest.mockReset();
    setBrowserOnline(true);
  });

  afterEach(() => {
    setBrowserOnline(true);
    vi.clearAllTimers();
  });

  it('retries a GET request once on a 503 response', async () => {
    const config = { url: '/payments/ref123', method: 'get' };
    const response = { data: { status: 'pending' } };
    mockRequest.mockResolvedValue(response);

    const pending = responseErrorHandler!({
      config,
      response: { status: 503 },
    });

    // advance past the first back-off delay (500 ms base)
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe(response);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'get', __serverRetryCount: 1 })
    );
  });

  it('retries up to MAX_SERVER_RETRIES (3) times on repeated 503s before rejecting', async () => {
    const config = {
      url: '/payments/ref123',
      method: 'get',
      __serverRetryCount: 2,
    };
    const error: RetryError = { config, response: { status: 503 } };

    // On the 3rd retry the mock resolves successfully.
    const response = { data: { status: 'settled' } };
    mockRequest.mockResolvedValue(response);

    const pending = responseErrorHandler!(error);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe(response);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('does not retry when MAX_SERVER_RETRIES is reached', async () => {
    const config = {
      url: '/payments/ref123',
      method: 'get',
      __serverRetryCount: 3,
    };
    const error: RetryError = { config, response: { status: 503 } };

    await expect(responseErrorHandler!(error)).rejects.toEqual(error);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not retry non-idempotent POST requests on 5xx', async () => {
    const config = { url: '/payments', method: 'post' };
    const error: RetryError = { config, response: { status: 500 } };

    await expect(responseErrorHandler!(error)).rejects.toEqual(error);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not retry a 4xx client error', async () => {
    const config = { url: '/payments/abc', method: 'get' };
    const error: RetryError = { config, response: { status: 422 } };

    await expect(responseErrorHandler!(error)).rejects.toEqual(error);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('retries a GET on a transient network error while online', async () => {
    setBrowserOnline(true);
    const config = { url: '/payments/ref123', method: 'get' };
    const response = { data: { status: 'pending' } };
    mockRequest.mockResolvedValue(response);

    const pending = responseErrorHandler!({ config });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe(response);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('does NOT use the server-retry path while offline (offline path handles that)', async () => {
    setBrowserOnline(false);
    // A request with no response and offline → handled by offline retry, not
    // the server-retry path. The offline retry has __offlineRetryCount = 2 to
    // simulate exhaustion so we can assert the final rejection.
    const config = { url: '/payments', method: 'get', __offlineRetryCount: 2 };
    const error: RetryError = { config };

    await expect(responseErrorHandler!(error)).rejects.toEqual(error);
    // Neither retry path should have kicked in (offline exhausted, server retry
    // skipped because navigator.onLine is false).
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
