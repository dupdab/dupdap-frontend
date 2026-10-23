'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorPageProps {
  /** The error thrown by the failing route segment. */
  error: Error & { digest?: string };
  /**
   * Next.js injects a `reset` callback that re-renders the route segment's
   * subtree — equivalent to a full client-side re-mount without a page reload.
   */
  reset: () => void;
}

/**
 * Global error boundary rendered by Next.js App Router whenever an
 * unhandled exception is thrown inside a route segment.
 *
 * Must be a Client Component so it can receive the `error` prop at runtime
 * and expose the `reset` action that triggers a re-render.
 *
 * Accessibility:
 * - `role="alert"` and `aria-live="assertive"` announce the error to
 *   screen readers as soon as the boundary mounts.
 * - Heading is linked to the alert region via `aria-labelledby`.
 */
export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to the console so developers can see the stack in DevTools even though
    // the visual UI only shows a human-readable message.
    // eslint-disable-next-line no-console
    console.error('[GlobalError boundary]', error);
  }, [error]);

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
      aria-labelledby="error-heading"
    >
      <div role="alert" aria-live="assertive" className="text-center max-w-md">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-5"
          aria-hidden="true"
        >
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <h1
          id="error-heading"
          className="text-2xl font-bold text-gray-900 mb-3"
        >
          Something went wrong
        </h1>

        <p className="text-gray-500 text-sm mb-2">
          An unexpected error occurred. You can try again, or go back to a safe
          page.
        </p>

        {/* Surface the error digest (if any) so support can trace it in
            server logs, without leaking raw error messages to users. */}
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
