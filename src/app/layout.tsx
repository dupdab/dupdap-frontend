import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthRedirectSetup } from '@/components/AuthRedirectSetup';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeScript } from '@/components/ThemeScript';
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Synchronously applies the dark class before first paint to prevent FOUC. */}
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <AuthRedirectSetup />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        {/* Live-region semantics are set per-call by '@/lib/toast', because
            react-hot-toast ignores per-type `ariaProps` in `toastOptions`. */}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
