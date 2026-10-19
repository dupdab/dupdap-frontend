import { CHANGELOG_ENTRIES, buildChangelogFeed } from '@/lib/changelog-entries';

export const dynamic = 'force-static';

export function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dupdub.com').replace(/\/$/, '');
  return new Response(buildChangelogFeed(CHANGELOG_ENTRIES, siteUrl), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
