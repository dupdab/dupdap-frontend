import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthRedirectSetup } from '@/components/AuthRedirectSetup';
import { CookieConsent } from '@/components/CookieConsent';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DupDub — Crypto-to-Fiat Settlement',
  description: 'Accept crypto payments, receive fiat settlements instantly',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AuthRedirectSetup />
          {children}
          {/* Live-region semantics are set per-call by '@/lib/toast', because
              react-hot-toast ignores per-type `ariaProps` in `toastOptions`. */}
          <Toaster position="top-right" />
          <CookieConsent />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
