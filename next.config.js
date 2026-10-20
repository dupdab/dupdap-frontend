/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});
const withPWA = require('next-pwa')({
  dest: 'public',
  // Disable the service worker in development so hot reloads aren't cached.
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Serve the offline fallback page when a navigation request fails offline.
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      // Cache-first for static build assets and images.
      urlPattern: /^https?:\/\/.*\/(_next\/static|icons|images)\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Network-first for API calls so merchants get fresh data when online.
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-responses',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      // Stale-while-revalidate for page navigations.
      urlPattern: /^https?:\/\/.*\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// Known Stellar / wallet origins that the app must be able to reach from the
// browser. Horizon (testnet + mainnet) for balance/tx submission, Soroban RPC
// for contract calls, and the Freighter / Stellar Wallets Kit endpoints used
// during wallet connection and signing.
const STELLAR_ORIGINS = [
  'https://horizon-testnet.stellar.org',
  'https://horizon.stellar.org',
  'https://soroban-testnet.stellar.org',
  'https://soroban.stellar.org',
  'https://friendbot.stellar.org',
  'https://api.freighter.app',
];

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  async headers() {
    const connectSrc = ["'self'", new URL(apiUrl).origin, ...STELLAR_ORIGINS];

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // script-src is set per-request in middleware.ts with a nonce so
              // inline scripts (e.g. JSON-LD) can run without 'unsafe-inline'
              // or 'unsafe-eval'. This static header is a fallback for routes
              // that bypass middleware; it intentionally omits both directives.
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              `connect-src ${connectSrc.join(' ')}`,
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  images: {
    // No next/image usage yet, but remote imagery (merchant logos, avatars,
    // marketing assets) is expected eventually. Add each external host here
    // via remotePatterns as it's introduced — next/image throws at
    // build/runtime for any domain not explicitly allow-listed.
    //
    // Example:
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'cdn.example.com',
    //     pathname: '/**',
    //   },
    // ],
    remotePatterns: [],
  },
};

// Sentry build-time integration: uploads source maps in production builds so
// stack traces in Sentry resolve to original source. Auth token and org/project
// are read from SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT env vars.
module.exports = withSentryConfig(withBundleAnalyzer(withPWA(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
