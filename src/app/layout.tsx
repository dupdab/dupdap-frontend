import { Toaster } from 'react-hot-toast';
import { I18nextProvider } from 'react-i18next';

import CookieConsent from '@/components/CookieConsent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryProvider } from '@/components/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeScript } from '@/components/ThemeScript';
import { LocaleProvider } from '@/lib/locale';
import { i18nInstance } from '@/i18n';
import { MockProvider } from '@/mocks/MockProvider';

import type { Metadata } from 'next';
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to apply dark/light class before first paint, preventing flash */}
        <ThemeScript />
      </head>
      <body>
        <I18nextProvider i18n={i18nInstance}>
          <MockProvider>
            <QueryProvider>
              <LocaleProvider>
                <ThemeProvider>
                  <ErrorBoundary>{children}</ErrorBoundary>
                  <Toaster position="top-right" />
                  <CookieConsent />
                </ThemeProvider>
              </LocaleProvider>
            </QueryProvider>
          </MockProvider>
        </I18nextProvider>
      </body>
    </html>
  );
}
