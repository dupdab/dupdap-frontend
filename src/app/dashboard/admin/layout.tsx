'use client';

import { useAuthStore } from '@/lib/store';
import { useAdminGuard, useAdminRedirect } from '@/lib/useAdminGuard';

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" aria-busy="true" aria-label="Loading">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  // The admin authorization gate is shared with the dashboard layout so the
  // decision is made during render, not only by a redirect effect (#357).
  const status = useAdminGuard();
  useAdminRedirect(status);

  // Show a neutral loading state while Zustand rehydrates from localStorage.
  // This prevents both the blank-page flash and the premature redirect.
  if (status === 'loading') {
    return <LoadingState />;
  }

  // Render an explicit loading state (instead of null) while the redirect
  // effect above navigates non-admin merchants away, avoiding a flash of
  // blank content. The admin children are never returned to an unauthorized
  // merchant, so there is no flash-of-unauthorized-content window.
  if (!token || status !== 'authorized') {
    return <LoadingState />;
  }

  return <>{children}</>;
}
