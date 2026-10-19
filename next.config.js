/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  async headers() {
    const connectSrc = ["'self'", new URL(apiUrl).origin];

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
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
