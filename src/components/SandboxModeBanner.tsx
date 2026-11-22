'use client';

import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

import { isSandboxMode } from '@/lib/sandbox';
import { useAuthStore } from '@/lib/store';

/**
 * Prominent amber banner shown at the top of every dashboard page while the
 * merchant is in sandbox mode, with a CTA back to settings.
 */
export function SandboxModeBanner() {
  const merchant = useAuthStore((state) => state.merchant);
  if (!isSandboxMode(merchant)) return null;

  return (
    <div
      role="status"
      data-testid="sandbox-mode-banner"
      className="bg-amber-100 border-b border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <FlaskConical className="w-4 h-4" aria-hidden="true" />
        <span className="font-semibold">Sandbox Mode</span>
        <span className="hidden sm:inline opacity-80">
          Test payments only — no real funds are moved.
        </span>
        <Link
          href="/dashboard/settings#environment"
          className="font-medium underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
        >
          Switch to production
        </Link>
      </div>
    </div>
  );
}

export default SandboxModeBanner;
