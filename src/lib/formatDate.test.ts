import { describe, expect, it } from 'vitest';
import { formatDate } from './utils';

// formatDate uses Intl.DateTimeFormat('en-US', ...) — pin locale output by
// using a specific date and asserting on known parts instead of a full string,
// or just verifying it contains recognisable date components.

describe('formatDate()', () => {
  // ── Guard-clause paths ──────────────────────────────────────────────────────

  it('returns "—" for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns "—" for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns "—" for an empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('returns "—" for an unparseable string ("not-a-date")', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('returns "—" for a random garbage string', () => {
    expect(formatDate('foo bar baz')).toBe('—');
  });

  // ── Valid ISO string ────────────────────────────────────────────────────────

  it('formats a valid ISO 8601 string and returns a non-empty string', () => {
    const result = formatDate('2024-06-15T10:30:00.000Z');
    expect(result).not.toBe('—');
    expect(result.length).toBeGreaterThan(0);
    // Should contain the year
    expect(result).toContain('2024');
  });

  it('includes month abbreviation for a known date', () => {
    // June 15 2024 → "Jun" in en-US short month format
    const result = formatDate('2024-06-15T10:30:00.000Z');
    expect(result).toMatch(/Jun/i);
  });

  it('includes the day of the month for a known date', () => {
    const result = formatDate('2024-06-15T10:30:00.000Z');
    expect(result).toMatch(/15/);
  });

  // ── Date object ─────────────────────────────────────────────────────────────

  it('formats a valid Date object', () => {
    const d = new Date('2023-01-01T00:00:00.000Z');
    const result = formatDate(d);
    expect(result).not.toBe('—');
    expect(result).toContain('2023');
  });

  it('returns "—" for an invalid Date object (new Date("bad"))', () => {
    expect(formatDate(new Date('bad'))).toBe('—');
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it('handles a numeric-looking string that is a valid date ("2024-01-31")', () => {
    const result = formatDate('2024-01-31');
    expect(result).not.toBe('—');
    expect(result).toContain('2024');
  });

  it('does not return the literal string "Invalid Date"', () => {
    // Regression guard: before the fix, formatDate returned "Invalid Date" instead of "—".
    expect(formatDate('not-a-date')).not.toBe('Invalid Date');
    expect(formatDate(undefined)).not.toBe('Invalid Date');
    expect(formatDate(null)).not.toBe('Invalid Date');
  });
});
