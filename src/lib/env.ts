const DEV_API_URL = 'http://localhost:3000/api/v1';

/**
 * Environment variables that must be set in production (#803).
 *
 * Values are read with literal `process.env.NAME` accesses so Next.js inlines
 * NEXT_PUBLIC_* variables into the client bundle.
 */
function readRequiredEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  };
}

export const REQUIRED_ENV_VARS = Object.keys(readRequiredEnv());

/**
 * Validates required environment variables. In production a missing variable
 * throws instead of silently falling back to localhost.
 */
export function validateEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = Object.entries(readRequiredEnv())
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`
    );
  }
}

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

// Fail fast at startup when a production build is misconfigured.
validateEnv();
