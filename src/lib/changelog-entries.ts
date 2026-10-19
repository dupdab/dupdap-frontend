export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

// Newest first. Add new releases at the top of this list.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '0.3.0',
    date: '2026-10-01',
    title: 'Bank accounts and XLM equivalents',
    changes: [
      'Merchants can manage multiple bank accounts from Settings.',
      'The customer payment page shows the equivalent XLM amount.',
      'Added a changelog with an RSS feed.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-15',
    title: 'Webhooks and settlements',
    changes: [
      'Webhook endpoints can be created, rotated and removed from the dashboard.',
      'Settlement history is available in the dashboard.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-06-01',
    title: 'Initial release',
    changes: ['Accept USDC payments on Stellar and receive fiat settlements.'],
  },
];

export const latestChangelogEntry = (): ChangelogEntry => CHANGELOG_ENTRIES[0];

export const changelogAnchor = (entry: ChangelogEntry): string => `v${entry.version}`;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildChangelogFeed(entries: ChangelogEntry[], siteUrl: string): string {
  const items = entries
    .map(
      (e) => `    <item>
      <title>${escapeXml(`${e.version} - ${e.title}`)}</title>
      <link>${escapeXml(`${siteUrl}/changelog#${changelogAnchor(e)}`)}</link>
      <guid isPermaLink="false">dupdub-changelog-${escapeXml(e.version)}</guid>
      <pubDate>${new Date(`${e.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(e.changes.join(' '))}</description>
    </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DupDub Changelog</title>
    <link>${escapeXml(`${siteUrl}/changelog`)}</link>
    <description>Product and API updates from DupDub.</description>
${items}
  </channel>
</rss>
`;
}
