import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Payment } from '@/lib/types';

import PaymentDetailPanel from './PaymentDetailPanel';

const payment = {
  id: 'p1',
  reference: 'REF-1',
  amountUsd: 10,
  status: 'pending',
  stellarMemo: 'memo123',
  stellarDepositAddress: 'GABC',
  createdAt: '2024-01-01T00:00:00Z',
} as Payment;

describe('PaymentDetailPanel', () => {
  it('renders nothing without a payment', () => {
    render(<PaymentDetailPanel payment={null} onClose={() => {}} />);
    expect(screen.queryByTestId('payment-detail-panel')).toBeNull();
  });

  it('shows detail and memo, and closes via button and Escape', () => {
    const onClose = vi.fn();
    render(<PaymentDetailPanel payment={payment} onClose={onClose} />);
    expect(screen.getByText('REF-1')).toBeTruthy();
    expect(screen.getByText('memo123')).toBeTruthy();
    fireEvent.click(screen.getByTestId('payment-detail-close'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
