/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
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
