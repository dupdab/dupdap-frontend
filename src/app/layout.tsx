import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthRedirectSetup } from '@/components/AuthRedirectSetup';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DupDub — Crypto-to-Fiat Settlement',
  description: 'Accept crypto payments, receive fiat settlements instantly',
  openGraph: {
    title: 'DupDub — Crypto-to-Fiat Settlement',
    description: 'Accept crypto payments, receive fiat settlements instantly',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DupDub — Crypto-to-Fiat Settlement',
    description: 'Accept crypto payments, receive fiat settlements instantly',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*
       * suppressHydrationWarning on <body> is intentional and narrow in scope.
       *
       * Zustand's `persist` middleware rehydrates `useAuthStore` from
       * `localStorage` synchronously during client bootstrap — after the
       * server has already serialized the initial HTML with no auth state.
       * Any client component that reads from the store (e.g. AuthRedirectSetup,
       * the dashboard layout) will therefore produce a different tree on the
       * first client render than the server did, triggering React's hydration
       * mismatch warning (#403).
       *
       * The `suppressHydrationWarning` prop tells React to accept the first
       * client paint without comparing it to the server-rendered HTML for this
       * subtree. It does NOT disable hydration — React still attaches event
       * handlers and continues reconciling normally after the first paint.
       *
       * Long-term fix: move auth state to an httpOnly, SameSite=Strict cookie
       * so the server can read it and render the correct initial tree (see
       * README "Auth token security").
       */}
      <body className={inter.className} suppressHydrationWarning>
        <AuthRedirectSetup />
        {children}
        {/* Live-region semantics are set per-call by '@/lib/toast', because
            react-hot-toast ignores per-type `ariaProps` in `toastOptions`. */}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
