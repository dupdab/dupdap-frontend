import { describe, it, expect } from 'vitest';

import robots from './robots';
import sitemap from './sitemap';

describe('sitemap and robots', () => {
  it('lists public pages and excludes pay and dashboard routes', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/waitlist'))).toBe(true);
    expect(
      urls.some((u) => u.includes('/pay/') || u.includes('/dashboard'))
    ).toBe(false);
  });

  it('disallows pay and dashboard routes', () => {
    const rules = robots().rules as { disallow: string[] };
    expect(rules.disallow).toEqual(
      expect.arrayContaining(['/pay/', '/dashboard/'])
    );
  });
});
