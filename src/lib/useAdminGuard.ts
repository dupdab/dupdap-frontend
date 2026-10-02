'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';

/** Path prefix guarded by the admin-only authorization check. */
export const ADMIN_PATH_PREFIX = '/dashboard/admin';

/** Returns true when `pathname` is inside the admin-only route tree. */
export function isAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);
}

export type AdminGuardStatus = 'loading' | 'authorized' | 'unauthorized';

/**
 * Single admin-authorization gate for the dashboard (#357).
 *
 * The admin check previously lived only in `src/app/dashboard/admin/layout.tsx`
 * as a `useEffect` redirect, which meant a non-admin merchant who deep-linked
 * to `/dashboard/admin/settlements` got the admin route mounted before the
 * effect fired. Both the dashboard layout and the admin layout now call this
 * hook, so the decision comes from the auth store during render — the caller
 * never returns the admin children to a merchant who is not authorized.
 *
 * Note: this cannot move into `src/middleware.ts` today, because the auth
 * store persists the token in `localStorage` (see README "Auth token
 * security"), which middleware cannot read. Once the token moves to an
 * httpOnly cookie this should be replaced by a server-side check.
 */
export function useAdminGuard(): AdminGuardStatus {
  const { merchant, hasHydrated } = useAuthStore();
  const pathname = usePathname();

  // While Zustand rehydrates we cannot know the role yet, so the caller must
  // render a loading state rather than assume authorization.
  if (!hasHydrated) return 'loading';

  if (!isAdminPath(pathname)) return 'authorized';

  if (!merchant || !isAdmin(merchant)) return 'unauthorized';

  return 'authorized';
}

/**
 * Redirects an unauthorized merchant away from the admin tree. Kept separate
 * from {@link useAdminGuard} so the guard itself stays a pure render-time
 * decision and this side effect can be skipped where it isn't wanted.
 */
export function useAdminRedirect(status: AdminGuardStatus) {
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthorized') {
      router.replace('/dashboard');
    }
  }, [status, router]);
}
