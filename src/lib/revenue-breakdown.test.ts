import { describe, expect, it } from 'vitest';

import { breakdownByPaymentMethod } from './revenue-breakdown';

describe('breakdownByPaymentMethod', () => {
  it('returns an empty array for no payments', () => {
    expect(breakdownByPaymentMethod([])).toEqual([]);
  });

  it('groups by method, defaults to Stellar and skips failed payments', () => {
    const rows = breakdownByPaymentMethod([
      { amountUsd: 10, status: 'settled' },
      { amountUsd: '5.5', status: 'settled', paymentMethod: 'Stellar (XLM)' },
      { amountUsd: 100, status: 'settled', paymentMethod: 'USDC' },
      { amountUsd: 50, status: 'failed', paymentMethod: 'USDC' },
    ]);
    expect(rows).toEqual([
      { name: 'USDC', value: 100, count: 1 },
      { name: 'Stellar (XLM)', value: 15.5, count: 2 },
    ]);
  });
});
