'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { merchant, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    if (merchant && !isAdmin(merchant)) {
      router.replace('/dashboard');
    }
  }, [token, merchant, router]);

  if (!merchant || !isAdmin(merchant)) return null;

  return <>{children}</>;
}
