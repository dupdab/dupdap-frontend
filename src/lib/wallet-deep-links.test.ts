import { describe, it, expect } from 'vitest';
import { buildWalletDeepLink, detectMobilePlatform, getStoreLink } from './wallet-deep-links';

describe('wallet-deep-links', () => {
  const params = { destination: 'GABC', amount: 12.5, memo: 'ref 1' };

  it('uses lobstr:// and solar:// schemes', () => {
    expect(buildWalletDeepLink('lobstr', params)).toBe(
      'lobstr://pay?destination=GABC&amount=12.5&memo=ref%201&memo_type=text',
    );
    expect(buildWalletDeepLink('solar', params).startsWith('solar://pay?')).toBe(true);
  });

  it('detects mobile platforms', () => {
    expect(detectMobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('ios');
    expect(detectMobilePlatform('Mozilla/5.0 (Linux; Android 14)')).toBe('android');
    expect(detectMobilePlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBeNull();
  });

  it('returns store links per platform', () => {
    expect(getStoreLink('lobstr', 'ios')).toContain('apps.apple.com');
    expect(getStoreLink('solar', 'android')).toContain('play.google.com');
  });
});
