import { describe, expect, it } from 'vitest';

import { paymentStatusLabel } from './locale';

const STATUSES = [
  'pending',
  'pending_approval',
  'confirmed',
  'processing',
  'settling',
  'settled',
  'completed',
  'failed',
  'expired',
] as const;

const EN_LABELS: Record<(typeof STATUSES)[number], string> = {
  pending: 'Pending',
  pending_approval: 'Pending approval',
  confirmed: 'Confirmed',
  processing: 'Processing',
  settling: 'Settling',
  settled: 'Settled',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
};

describe('paymentStatusLabel()', () => {
  it.each(STATUSES)('maps %s to a human-readable English label', (status) => {
    expect(paymentStatusLabel(status, 'en')).toBe(EN_LABELS[status]);
  });

  it('never surfaces a raw enum token', () => {
    for (const status of STATUSES) {
      const label = paymentStatusLabel(status, 'en');
      expect(label).not.toBe(status.toUpperCase());
      expect(label).not.toContain('_');
    }
  });

  it('uses translated labels for French and Portuguese merchants', () => {
    expect(paymentStatusLabel('confirmed', 'fr')).toBe('Confirmé');
    expect(paymentStatusLabel('confirmed', 'pt')).toBe('Confirmado');
  });

  it('produces a readable fallback for unknown status values', () => {
    expect(paymentStatusLabel('awaiting_review', 'en')).toBe('Awaiting Review');
  });
});
