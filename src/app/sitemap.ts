import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dupdub.com').replace(/\/$/, '');

/**
 * Public, indexable pages only. `/pay/[paymentId]` pages are dynamic and
 * per-customer, and dashboard routes are private, so both are deliberately
 * excluded here and disallowed in robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/waitlist`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
