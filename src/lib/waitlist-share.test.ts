import { describe, it, expect } from 'vitest';

import {
  buildReferralLink,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  parseJoinResponse,
} from './waitlist-share';

describe('waitlist-share', () => {
  it('builds a referral link', () => {
    expect(buildReferralLink('https://x.io', 'a b')).toBe(
      'https://x.io/waitlist?ref=a%20b'
    );
  });
  it('builds share urls with encoded text', () => {
    expect(buildTwitterShareUrl('https://x.io/w', 'hi there')).toBe(
      'https://twitter.com/intent/tweet?text=hi%20there&url=https%3A%2F%2Fx.io%2Fw'
    );
    expect(buildWhatsAppShareUrl('https://x.io/w', 'hi')).toBe(
      'https://wa.me/?text=hi%20https%3A%2F%2Fx.io%2Fw'
    );
  });
  it('parses join response', () => {
    expect(
      parseJoinResponse({ position: 42, referralCode: 'abc' }, 'f')
    ).toEqual({ position: 42, code: 'abc' });
    expect(parseJoinResponse({}, 'f')).toEqual({ position: null, code: 'f' });
  });
});
