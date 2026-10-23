import { describe, expect, it } from 'vitest';

import { maskAccountNumber } from './bank-accounts-api';

describe('maskAccountNumber', () => {
  it('shows only the last four digits', () => {
    expect(maskAccountNumber('1234567890')).toBe('****7890');
  });

  it('leaves short values unchanged', () => {
    expect(maskAccountNumber('123')).toBe('123');
  });
});
