/** @type {import('next').NextConfig} */
const DEV_API_URL = 'http://localhost:3000/api/v1';
const isDev = process.env.NODE_ENV !== 'production';

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (isDev) return DEV_API_URL;
  return undefined;
}

function getApiOrigin() {
  try {
    return new URL(getApiUrl() ?? DEV_API_URL).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

function buildContentSecurityPolicy() {
  const apiOrigin = getApiOrigin();

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: getApiUrl(),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
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

module.exports = nextConfig;
