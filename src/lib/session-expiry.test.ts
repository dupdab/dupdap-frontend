import { describe, it, expect } from 'vitest';

import {
  SESSION_WARNING_MS,
  formatRemaining,
  getSessionPhase,
  getTokenExpiryMs,
} from './session-expiry';

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`;
}

describe('getTokenExpiryMs', () => {
  it('returns exp in milliseconds', () => {
    expect(getTokenExpiryMs(makeJwt({ exp: 1000 }))).toBe(1_000_000);
  });

  it('returns null for missing, malformed or exp-less tokens', () => {
    expect(getTokenExpiryMs(null)).toBeNull();
    expect(getTokenExpiryMs('not-a-jwt')).toBeNull();
    expect(getTokenExpiryMs('a.!!!.c')).toBeNull();
    expect(getTokenExpiryMs(makeJwt({ sub: 'x' }))).toBeNull();
  });
});

describe('getSessionPhase', () => {
  const expiry = 10_000_000;

  it('is active well before expiry', () => {
    expect(getSessionPhase(expiry, expiry - SESSION_WARNING_MS - 1)).toBe('active');
  });

  it('is warning within 5 minutes of expiry', () => {
    expect(getSessionPhase(expiry, expiry - SESSION_WARNING_MS)).toBe('warning');
    expect(getSessionPhase(expiry, expiry - 1)).toBe('warning');
  });

  it('is expired at and after expiry', () => {
    expect(getSessionPhase(expiry, expiry)).toBe('expired');
    expect(getSessionPhase(expiry, expiry + 5)).toBe('expired');
  });
});

describe('formatRemaining', () => {
  it('formats m:ss', () => {
    expect(formatRemaining(299_000)).toBe('4:59');
    expect(formatRemaining(60_000)).toBe('1:00');
    expect(formatRemaining(-5)).toBe('0:00');
  });
});
