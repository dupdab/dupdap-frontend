import { describe, it, expect, vi, beforeEach } from 'vitest';

import { redirectToLogin, resolveNextPath, setAuthRedirectHandler } from './auth-redirect';

describe('redirectToLogin', () => {
  beforeEach(() => {
    setAuthRedirectHandler(null);
  });

  it('uses the registered client-side handler with the current path', () => {
    const handler = vi.fn();
    setAuthRedirectHandler(handler);

    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard/webhooks',
        search: '?tab=1',
        assign: vi.fn(),
      },
      writable: true,
    });

    redirectToLogin();

    expect(handler).toHaveBeenCalledWith('/dashboard/webhooks?tab=1');
  });

  it('falls back to a login URL with next when no handler is registered', () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard/payments', search: '', assign },
      writable: true,
    });

    redirectToLogin('/dashboard/payments');

    expect(assign).toHaveBeenCalledWith(
      '/auth/login?next=%2Fdashboard%2Fpayments'
    );
  });

  it('falls back to window.location.assign when a previously registered handler is unregistered mid-flight', () => {
    const staleHandler = vi.fn();
    const assign = vi.fn();

    // 1. Register handler (e.g. AuthRedirectSetup mount)
    setAuthRedirectHandler(staleHandler);

    // 2. Unregister handler mid-flight (e.g. AuthRedirectSetup unmount cleanup)
    setAuthRedirectHandler(null);

    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard/settlements',
        search: '?status=pending',
        assign,
      },
      writable: true,
    });

    expect(() => redirectToLogin()).not.toThrow();

    // Stale handler must not be invoked
    expect(staleHandler).not.toHaveBeenCalled();
    // Must fall back to window.location.assign with encoded return path
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(
      '/auth/login?next=%2Fdashboard%2Fsettlements%3Fstatus%3Dpending'
    );
  });
});

describe('resolveNextPath (#761)', () => {
  it('accepts same-origin relative paths including query strings', () => {
    expect(resolveNextPath('/dashboard/webhooks?tab=1')).toBe('/dashboard/webhooks?tab=1');
  });

  it('falls back when next is missing or empty', () => {
    expect(resolveNextPath(null)).toBe('/dashboard');
    expect(resolveNextPath(undefined)).toBe('/dashboard');
    expect(resolveNextPath('')).toBe('/dashboard');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(resolveNextPath('https://evil.example/phish')).toBe('/dashboard');
    expect(resolveNextPath('//evil.example')).toBe('/dashboard');
    expect(resolveNextPath('javascript:alert(1)')).toBe('/dashboard');
  });

  it('rejects backslash and control-character tricks', () => {
    expect(resolveNextPath('/\\evil.example')).toBe('/dashboard');
    expect(resolveNextPath('/\tevil')).toBe('/dashboard');
  });

  it('rejects a loop back to the login page', () => {
    expect(resolveNextPath('/auth/login?next=%2Fdashboard')).toBe('/dashboard');
  });

  it('honours a custom fallback', () => {
    expect(resolveNextPath('https://evil.example', '/home')).toBe('/home');
  });
});
