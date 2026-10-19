'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

/**
 * Persistent connection-status banner for the dashboard (#547). It renders
 * only while `navigator.onLine` is false and is announced to screen readers
 * through a polite live region so the status change is not visual-only.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className="sticky top-14 md:top-0 z-20 flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-semibold">You are offline</span>{' — '}
        check your connection. Changes can&apos;t be saved until you&apos;re back online.
      </p>
    </div>
  );
}

export default OfflineBanner;
