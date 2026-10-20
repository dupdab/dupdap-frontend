import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { ThemeScript } from '@/components/ThemeScript';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LocaleProvider } from '@/lib/locale';
import { QueryProvider } from '@/components/QueryProvider';
import CookieConsent from '@/components/CookieConsent';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'DupDub — Accept Crypto, Receive Fiat Instantly',
    template: '%s — DupDub',
  },
  description:
    'DupDub bridges Web3 payments with traditional banking. Merchants receive NGN/USD settlements while customers pay with USDC on Stellar.',
  metadataBase: new URL('https://dupdub.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to apply dark/light class before first paint, preventing flash */}
        <ThemeScript />
      </head>
      <body>
        <QueryProvider>
          <LocaleProvider>
            <ThemeProvider>
              {children}
              <Toaster position="top-right" />
              <CookieConsent />
            </ThemeProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
