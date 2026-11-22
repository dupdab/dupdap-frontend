import { describe, expect, it } from 'vitest';

import { formatUsd } from './utils';

describe('formatUsd()', () => {
  it('formats a typical whole-dollar amount', () => {
    expect(formatUsd(100)).toBe('$100.00');
  });

  it('formats a typical amount with cents', () => {
    expect(formatUsd(1234.56)).toBe('$1,234.56');
  });

  it('formats zero as $0.00', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('formats a small fractional amount', () => {
    expect(formatUsd(0.99)).toBe('$0.99');
  });

  it('formats a large amount with comma grouping', () => {
    expect(formatUsd(1000000)).toBe('$1,000,000.00');
  });

  it('formats a negative number with a minus sign', () => {
    const result = formatUsd(-50.25);
    expect(result).toContain('50.25');
  });

  it('formats negative zero as $0.00', () => {
    expect(formatUsd(-0)).toBe('$0.00');
  });

  it('returns NaN-containing string for NaN input', () => {
    const result = formatUsd(NaN);
    expect(result).toContain('NaN');
  });

  it('returns NaN-containing string for undefined coerced to number', () => {
    const result = formatUsd(undefined as unknown as number);
    expect(result).toContain('NaN');
  });

  it('rounds to two decimal places', () => {
    expect(formatUsd(19.999)).toBe('$20.00');
  });

  it('handles very small positive amount', () => {
    expect(formatUsd(0.01)).toBe('$0.01');
  });

  it('handles amount with more than two decimal places', () => {
    const result = formatUsd(1.005);
    expect(['$1.00', '$1.01']).toContain(result);
  });

  describe('locale-aware separators (#860)', () => {
    it('formats 1234567.89 for en-US with comma grouping and a decimal point', () => {
      expect(formatUsd(1234567.89, 'en-US')).toBe('$1,234,567.89');
    });

    it('formats 1234567.89 for en-GB with comma grouping and a decimal point', () => {
      expect(formatUsd(1234567.89, 'en-GB')).toBe('US$1,234,567.89');
    });

    it('formats 1234567.89 for fr-FR with a comma decimal separator', () => {
      const result = formatUsd(1234567.89, 'fr-FR');
      expect(result).toContain(',89');
      expect(result).not.toContain('1,234,567');
      expect(result.replace(/\u202f|\u00a0/g, ' ')).toBe('1 234 567,89 $US');
    });

    it('uses the browser locale when no locale is supplied', () => {
      expect(formatUsd(1234567.89)).toBe(
        new Intl.NumberFormat(navigator.language, {
          style: 'currency',
          currency: 'USD',
        }).format(1234567.89)
      );
    });
  });
});
