import { describe, expect, it } from 'vitest';

import {
  CHANGELOG_ENTRIES,
  buildChangelogFeed,
  escapeXml,
} from './changelog-entries';

describe('changelog entries', () => {
  it('escapes XML special characters', () => {
    expect(escapeXml('a & <b>')).toBe('a &amp; &lt;b&gt;');
  });

  it('builds an RSS feed with one item per entry', () => {
    const xml = buildChangelogFeed(CHANGELOG_ENTRIES, 'https://dupdub.com');
    expect(xml).toContain('<rss version="2.0">');
    expect(xml.match(/<item>/g)?.length).toBe(CHANGELOG_ENTRIES.length);
  });
});
