'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" aria-busy="true" aria-label="Loading">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { merchant, token, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && merchant && !isAdmin(merchant)) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, merchant, router]);

  // Show a neutral loading state while Zustand rehydrates from localStorage.
  // This prevents both the blank-page flash and the premature redirect.
  if (!hasHydrated) {
    return <LoadingState />;
  }

  // Render an explicit loading state (instead of null) while the redirect
  // effect above navigates non-admin merchants away, avoiding a flash of
  // blank content.
  if (!token || !merchant || !isAdmin(merchant)) {
    return <LoadingState />;
  }

  return <>{children}</>;
}
