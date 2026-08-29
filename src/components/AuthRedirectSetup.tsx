'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthRedirectHandler } from '@/lib/auth-redirect';

export default function AuthRedirectSetup() {
  const router = useRouter();

  useEffect(() => {
    setAuthRedirectHandler((returnPath) => {
      const next =
        returnPath && !returnPath.startsWith('/auth/login')
          ? `?next=${encodeURIComponent(returnPath)}`
          : '';
      router.push(`/auth/login${next}`);
    });

    return () => setAuthRedirectHandler(null);
  }, [router]);

  return null;
}
