'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/lib/store';

/**
 * Redirects unauthenticated users to the login page, preserving the path they
 * were trying to reach via the `next` query param.
 *
 * **Hydration safety**: we intentionally wait until both the component is
 * mounted on the client *and* Zustand has finished rehydrating from
 * `localStorage` before evaluating authentication status. Without this guard,
 * the server renders the tree with `token = null` (no `localStorage` on the
 * server), while the client immediately rehydrates to `token = <stored value>`,
 * causing a React hydration mismatch warning (#403).
 */
export function AuthRedirectSetup() {
  const router = useRouter();
  const pathname = usePathname();
  const merchant = useAuthStore((s) => s.merchant);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // Track whether this component has mounted on the client. We cannot rely on
  // `hasHydrated` alone because Zustand sets it synchronously from
  // `onRehydrateStorage`, which may fire before or after the first React
  // paint depending on the browser's task scheduling.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Do not redirect until we are both mounted on the client and Zustand has
    // finished reading from localStorage. Acting before either of these is
    // ready would redirect users who actually have a valid stored session.
    if (!mounted || !hasHydrated) return;

    const isAuthenticated = Boolean(merchant);
    if (isAuthenticated) return;
    if (pathname.startsWith('/auth/login')) return;

    const returnPath = pathname;
    // Guard against open redirects: only forward same-origin, single-leading-slash
    // paths into the `next` param (mirrors the login page's consumption-time check).
    const safeNext =
      returnPath.startsWith('/') && !returnPath.startsWith('//')
        ? returnPath
        : '/dashboard';
    router.replace(`/auth/login?next=${encodeURIComponent(safeNext)}`);
  }, [mounted, hasHydrated, merchant, pathname, router]);

  // This component is always invisible — it only manages side-effect redirects.
  return null;
}
