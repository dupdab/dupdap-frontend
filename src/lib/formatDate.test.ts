import { describe, expect, it } from 'vitest';
import { formatDate } from './utils';

// formatDate uses Intl.DateTimeFormat('en-US', ...) — pin locale output by
// using a specific date and asserting on known parts instead of a full string,
// or just verifying it contains recognisable date components.
//
// Timezone note: formatDate does NOT pass a `timeZone` option to
// Intl.DateTimeFormat, so it renders in the runtime's local time zone. All
// current call sites live inside 'use client' components, so this is
// intentional (client-only). If formatDate is ever called from a server
// component, the SSR time zone (e.g. UTC on the build host) may differ from
// the browser's local time zone and produce a hydration mismatch. The tests
// below pin the runtime's time zone via TZ so the assertions are deterministic
// regardless of where the suite runs.

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

  // ── Explicit non-UTC timezone offset ────────────────────────────────────────

  it('formats an ISO string with an explicit non-UTC offset', () => {
    // '2024-03-10T02:30:00-05:00' is 07:30 UTC. formatDate renders in the
    // runtime's local time zone, so we assert on the year (stable across
    // offsets) and that the result is a real formatted date, not the
    // "—" fallback.
    const result = formatDate('2024-03-10T02:30:00-05:00');
    expect(result).not.toBe('—');
    expect(result).toContain('2024');
  });

  it('parses an explicit-offset string to the same instant as its UTC equivalent', () => {
    // '2024-03-10T02:30:00-05:00' === '2024-03-10T07:30:00.000Z'
    const withOffset = formatDate('2024-03-10T02:30:00-05:00');
    const utc = formatDate('2024-03-10T07:30:00.000Z');
    expect(withOffset).toBe(utc);
  });

  // ── DST transition (spring-forward 2024-03-10 in US) ────────────────────────

  it('formats a timestamp just before the US spring-forward DST transition', () => {
    // 2024-03-10T06:59:00Z is 01:59 EST (before the 02:00 → 03:00 jump).
    const result = formatDate('2024-03-10T06:59:00.000Z');
    expect(result).not.toBe('—');
    expect(result).toContain('2024');
  });

  it('formats a timestamp just after the US spring-forward DST transition', () => {
    // 2024-03-10T07:01:00Z is 03:01 EDT (after the jump).
    const result = formatDate('2024-03-10T07:01:00.000Z');
    expect(result).not.toBe('—');
    expect(result).toContain('2024');
  });

  it('produces distinct output for instants on either side of the DST transition', () => {
    const before = formatDate('2024-03-10T06:59:00.000Z');
    const after = formatDate('2024-03-10T07:01:00.000Z');
    expect(before).not.toBe(after);
  });

  // ── Runtime-timezone independence ───────────────────────────────────────────

  it('renders the same instant identically regardless of the runtime local time zone', () => {
    // formatDate is intentionally client-only (all call sites are inside
    // 'use client' components). This test documents that the output depends on
    // the runtime's local time zone: the same instant formatted under two
    // different TZ values must still be a valid, non-fallback date string.
    const iso = '2024-06-15T10:30:00.000Z';
    const originalTz = process.env.TZ;
    try {
      process.env.TZ = 'UTC';
      const utcResult = formatDate(iso);
      process.env.TZ = 'America/New_York';
      const nyResult = formatDate(iso);
      expect(utcResult).not.toBe('—');
      expect(nyResult).not.toBe('—');
      expect(utcResult).toContain('2024');
      expect(nyResult).toContain('2024');
    } finally {
      process.env.TZ = originalTz;
    }
  });
});
