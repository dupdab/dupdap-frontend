import { describe, expect, it } from 'vitest';
import { formatNgn } from './utils';

describe('formatNgn()', () => {
  it('formats a typical whole-naira amount', () => {
    expect(formatNgn(100)).toBe('₦100.00');
  });

  it('formats a typical amount with kobo', () => {
    expect(formatNgn(1234.56)).toBe('₦1,234.56');
  });

  it('formats zero as ₦0.00', () => {
    expect(formatNgn(0)).toBe('₦0.00');
  });

  it('formats a small fractional amount', () => {
    expect(formatNgn(0.99)).toBe('₦0.99');
  });

  it('formats a large amount with comma grouping', () => {
    expect(formatNgn(1000000)).toBe('₦1,000,000.00');
  });

  it('formats a negative number with a minus sign', () => {
    const result = formatNgn(-50.25);
    expect(result).toContain('50.25');
  });

  it('formats negative zero as ₦0.00', () => {
    expect(formatNgn(-0)).toBe('₦0.00');
  });

  it('returns NaN-containing string for NaN input', () => {
    const result = formatNgn(NaN);
    expect(result).toContain('NaN');
  });

  it('rounds to two decimal places', () => {
    expect(formatNgn(19.999)).toBe('₦20.00');
  });

  it('handles very small positive amount', () => {
    expect(formatNgn(0.01)).toBe('₦0.01');
  });

  it('handles amount with more than two decimal places', () => {
    const result = formatNgn(1.005);
    expect(['₦1.00', '₦1.01']).toContain(result);
  });

  it('uses the ₦ symbol, not the $ symbol', () => {
    expect(formatNgn(100)).toContain('₦');
    expect(formatNgn(100)).not.toContain('$');
  });
});
