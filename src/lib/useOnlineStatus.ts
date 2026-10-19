'use client';

import { useSyncExternalStore } from 'react';

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

// Attach once at module scope so a status change that happens between renders
// or before a component mounts is not lost. Safe during SSR: no window exists.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    emitChange();
  });
  window.addEventListener('offline', () => {
    isOnline = false;
    emitChange();
  });
}

function subscribeToNetworkStatus(onStoreChange: () => void) {
  // Re-read `navigator.onLine` on mount in case the status changed before
  // hydration completed. This also keeps the module state in sync with the
  // browser when a component subscribes after the initial render.
  const browserStatus = navigator.onLine;
  if (browserStatus !== isOnline) {
    isOnline = browserStatus;
    onStoreChange();
  }

  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getOnlineSnapshot(): boolean {
  return isOnline;
}

/**
 * Server rendering has no connection to inspect. Assume online so the initial
 * client render matches the server HTML; the real status is read immediately
 * after hydration (#547).
 */
function getOnlineServerSnapshot(): boolean {
  return true;
}

/**
 * Tracks `navigator.onLine`, kept in sync by the browser's `online` and
 * `offline` events. Used by the offline banner and by forms that must not
 * submit while the connection is down (#547).
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToNetworkStatus,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );
}
