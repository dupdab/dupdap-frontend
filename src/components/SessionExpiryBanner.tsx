'use client';

import { useCallback, useEffect, useState } from 'react';

import api from '@/lib/api';
import {
  formatRemaining,
  getSessionPhase,
  getTokenExpiryMs,
} from '@/lib/session-expiry';
import { useAuthStore } from '@/lib/store';
import toast from '@/lib/toast';

/**
 * Warns the user 5 minutes before the session JWT expires, offers a one-click
 * extension via the refresh endpoint, and logs the user out with a toast once
 * the session has expired (#764).
 *
 * The expiry is read from the `exp` claim of the token held in the auth store.
 * When no readable token exists (e.g. httpOnly cookie only) nothing is shown.
 */
export function SessionExpiryBanner() {
  const token = useAuthStore((s) => s.token);
  const [now, setNow] = useState(() => Date.now());
  const [extending, setExtending] = useState(false);

  const expiryMs = getTokenExpiryMs(token);

  useEffect(() => {
    if (expiryMs === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiryMs]);

  const phase = expiryMs === null ? null : getSessionPhase(expiryMs, now);

  useEffect(() => {
    if (phase !== 'expired') return;
    void useAuthStore.getState().logout();
    toast.error('Your session has expired. Please sign in again.');
    if (typeof window !== 'undefined') {
      window.location.assign('/auth/login');
    }
  }, [phase]);

  const extend = useCallback(async () => {
    setExtending(true);
    try {
      const res = await api.post<{ accessToken?: string }>('/auth/refresh');
      const next = res?.data?.accessToken;
      if (next) useAuthStore.setState({ token: next });
      toast.success('Session extended.');
    } catch {
      toast.error('Could not extend your session. Please save your work.');
    } finally {
      setExtending(false);
    }
  }, []);

  if (expiryMs === null || phase !== 'warning') return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 shadow-lg"
    >
      <span>
        Your session expires in {formatRemaining(expiryMs - now)}. Save your
        work or extend your session.
      </span>
      <button
        type="button"
        className="btn-primary"
        onClick={extend}
        disabled={extending}
      >
        {extending ? 'Extending...' : 'Extend session'}
      </button>
    </div>
  );
}

export default SessionExpiryBanner;
