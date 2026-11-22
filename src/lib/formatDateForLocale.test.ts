import { describe, expect, it } from 'vitest';

import { formatDateForLocale } from './utils';

const DATE = '2024-06-15T23:30:00.000Z';

describe('formatDateForLocale()', () => {
  it('formats UK dates as DD/MM/YYYY', () => {
    expect(formatDateForLocale(DATE, 'en-GB')).toBe('15/06/2024');
  });

  it('formats Nigerian dates as DD/MM/YYYY', () => {
    expect(formatDateForLocale(DATE, 'en-NG')).toBe('15/06/2024');
    expect(formatDateForLocale(DATE, 'pcm')).toBe('15/06/2024');
  });

  it('formats ISO contexts as YYYY-MM-DD', () => {
    expect(formatDateForLocale(DATE, 'iso')).toBe('2024-06-15');
    expect(formatDateForLocale(DATE, 'en-GB', 'iso')).toBe('2024-06-15');
  });

  it('formats French and Portuguese dates as DD/MM/YYYY', () => {
    expect(formatDateForLocale(DATE, 'fr')).toBe('15/06/2024');
    expect(formatDateForLocale(DATE, 'pt')).toBe('15/06/2024');
  });

  it('keeps US month-first order for en-US', () => {
    expect(formatDateForLocale(DATE, 'en-US')).toBe('06/15/2024');
  });

  it('falls back to a dash for missing or invalid dates', () => {
    expect(formatDateForLocale(undefined, 'en-GB')).toBe('—');
    expect(formatDateForLocale('not-a-date', 'en-GB')).toBe('—');
  });
});
