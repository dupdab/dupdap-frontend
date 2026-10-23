'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { changelogAnchor, latestChangelogEntry } from '@/lib/changelog-entries';

const STORAGE_KEY = 'dupdub:changelog-dismissed';

export default function WhatsNewBanner() {
  const entry = latestChangelogEntry();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === entry.version);
    } catch {
      setDismissed(false);
    }
  }, [entry.version]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, entry.version);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-3 bg-brand-50 border-b border-brand-100 px-4 py-2 text-sm text-gray-800"
      data-testid="whats-new-banner"
    >
      <p>
        What&apos;s new in v{entry.version}:{' '}
        <Link
          href={`/changelog#${changelogAnchor(entry)}`}
          className="font-medium text-brand-700 hover:underline"
        >
          {entry.title}
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss what's new banner"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}
