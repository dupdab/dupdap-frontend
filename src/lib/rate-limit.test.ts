import { describe, it, expect } from 'vitest';

import {
  isNearRateLimit,
  parseRateLimit,
  rateLimitPercent,
} from './rate-limit';

describe('rate-limit', () => {
  it('computes percent clamped to 0-100', () => {
    expect(rateLimitPercent({ limit: 100, used: 25 })).toBe(25);
    expect(rateLimitPercent({ limit: 100, used: 250 })).toBe(100);
    expect(rateLimitPercent({ limit: 0, used: 5 })).toBe(0);
  });
  it('flags 80% or more', () => {
    expect(isNearRateLimit({ limit: 100, used: 79 })).toBe(false);
    expect(isNearRateLimit({ limit: 100, used: 80 })).toBe(true);
  });
  it('parses response shapes', () => {
    expect(parseRateLimit({ limit: 60, used: 10 })).toEqual({
      limit: 60,
      used: 10,
    });
    expect(parseRateLimit({ limit: 60, remaining: 20 })).toEqual({
      limit: 60,
      used: 40,
    });
    expect(parseRateLimit({})).toBeNull();
  });
});
