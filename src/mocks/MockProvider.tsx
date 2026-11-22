'use client';

import { useEffect, useState } from 'react';

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(
    process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled'
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled') return;

    let cancelled = false;
    import('./browser')
      .then(({ worker }) =>
        worker.start({
          onUnhandledRequest: 'bypass',
          serviceWorker: { url: '/mockServiceWorker.js' },
        })
      )
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        console.error('Failed to start MSW mock worker', error);
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
