import Link from 'next/link';

import { CHANGELOG_ENTRIES, changelogAnchor } from '@/lib/changelog-entries';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog — DupDub',
  description: 'Version history and API changes for DupDub.',
  alternates: { types: { 'application/rss+xml': '/changelog/feed.xml' } },
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Changelog</h1>
          <a
            href="/changelog/feed.xml"
            className="text-sm text-brand-600 hover:underline"
          >
            RSS feed
          </a>
        </div>
        <div className="space-y-10">
          {CHANGELOG_ENTRIES.map((entry) => (
            <article key={entry.version} id={changelogAnchor(entry)}>
              <p className="text-sm text-gray-500">
                v{entry.version} · {entry.date}
              </p>
              <h2 className="text-xl font-semibold text-gray-900 mt-1">
                {entry.title}
              </h2>
              <ul className="list-disc pl-5 mt-3 space-y-1 text-gray-700">
                {entry.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <Link
          href="/"
          className="inline-block mt-12 text-sm text-gray-500 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
