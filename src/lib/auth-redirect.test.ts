import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirectToLogin, setAuthRedirectHandler } from './auth-redirect';

describe('redirectToLogin', () => {
  beforeEach(() => {
    setAuthRedirectHandler(null);
  });

  it('uses the registered client-side handler with the current path', () => {
    const handler = vi.fn();
    setAuthRedirectHandler(handler);

    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard/webhooks', search: '?tab=1', assign: vi.fn() },
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

    expect(assign).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard%2Fpayments');
  });
});
