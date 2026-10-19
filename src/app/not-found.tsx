import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found — DupDub',
  description: 'The page you were looking for could not be found.',
};

/**
 * Global 404 page rendered by Next.js App Router when no route matches.
 * This is a server component — no auth checks needed here.
 */
export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
      aria-labelledby="not-found-heading"
    >
      <div className="text-center max-w-md">
        {/* Large decorative 404 — hidden from screen readers, which get the
            heading text instead */}
        <p
          className="text-8xl font-extrabold text-brand-200 select-none mb-2"
          aria-hidden="true"
        >
          404
        </p>

        <h1
          id="not-found-heading"
          className="text-2xl font-bold text-gray-900 mb-3"
        >
          Page not found
        </h1>

        <p className="text-gray-500 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Double-check the URL, or head back to somewhere familiar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Go to home
          </Link>
        </div>
      </div>
    </main>
  );
}
