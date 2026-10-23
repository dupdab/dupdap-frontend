import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import XlmEquivalent, { isXlmRateStale } from './XlmEquivalent';

describe('XlmEquivalent', () => {
  it('renders the XLM equivalent', () => {
    render(<XlmEquivalent amountXlm={12.5} />);
    expect(screen.getByText('Equivalent: 12.50 XLM')).toBeInTheDocument();
  });

  it('renders nothing without an amount', () => {
    render(<XlmEquivalent amountXlm={undefined} />);
    expect(screen.queryByTestId('xlm-equivalent')).toBeNull();
  });

  it('flags rates older than 2 minutes as stale', () => {
    const now = Date.now();
    expect(isXlmRateStale(new Date(now - 3 * 60_000).toISOString(), now)).toBe(
      true
    );
    expect(isXlmRateStale(new Date(now - 30_000).toISOString(), now)).toBe(
      false
    );
  });
});
