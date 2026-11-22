const DEV_API_URL = 'http://localhost:3000/api/v1';

export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return DEV_API_URL;
  }

  throw new Error('NEXT_PUBLIC_API_URL is not configured');
}

/**
 * WebSocket endpoint for real-time dashboard events (#795).
 * Uses NEXT_PUBLIC_WS_URL when set, otherwise derives `<api url>/ws` with a
 * ws:// or wss:// scheme.
 */
export function getWsUrl(): string {
  const url = process.env.NEXT_PUBLIC_WS_URL;
  if (url) return url;
  return `${getApiUrl().replace(/^http/, 'ws').replace(/\/$/, '')}/ws`;
}
