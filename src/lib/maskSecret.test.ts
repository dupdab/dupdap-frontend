import { describe, expect, it } from 'vitest';
import { maskSecret } from './utils';

describe('maskSecret() (#337)', () => {
  it('masks short values without revealing nearly all of them', () => {
    // A 9-character value previously revealed 8 of its 9 characters in plaintext;
    // now at most 4 are shown, and the bullet run is always 8 long.
    expect(maskSecret('abcdefghi')).toBe('ab••••••••hi');
  });

  it('reveals at most the first and last two characters of a long value', () => {
    expect(maskSecret('whsec_abcdefghijklmnop')).toBe('wh••••••••op');
  });

  it('uses a constant bullet run regardless of value length', () => {
    // The old formula scaled the bullets with the value, revealing more of
    // shorter credentials. The mask is now fixed.
    expect(maskSecret('abcdefgh')).toBe('ab••••••••gh');
    expect(maskSecret('abcdefghijklmnopqrstuvwxyz')).toBe('ab••••••••yz');
  });

  it('never leaks the value for inputs too short to reveal safely', () => {
    expect(maskSecret('abcd')).toBe('••••••••');
    expect(maskSecret('abc')).toBe('••••••••');
    expect(maskSecret('')).toBe('••••••••');
  });

  it('accepts custom visible/bullet counts', () => {
    expect(maskSecret('whsec_abcdefghijklmnop', 4, 4)).toBe('whse••••mnop');
  });
});
