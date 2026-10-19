import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dupdub.com').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/waitlist'],
      // Payment pages are per-customer and dynamic; dashboard and auth are private.
      disallow: ['/pay/', '/dashboard/', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
