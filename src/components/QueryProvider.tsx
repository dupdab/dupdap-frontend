'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * QueryProvider — wraps the app in TanStack Query's QueryClientProvider.
 *
 * The QueryClient is created inside a useState initialiser so each browser
 * session gets its own client instance, and the client is not recreated on
 * re-renders. The client must be created client-side (not module-level) to
 * avoid sharing state across server-rendered requests.
 *
 * Mount once in the root layout.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data fresh for 30 s before a background refetch is triggered.
            staleTime: 30_000,
            // Retry failed requests once before surfacing an error.
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
