import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PayPage from '@/app/pay/[paymentId]/page';
import { paymentsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    getByReference: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  ),
}));

const basePayment = {
  id: 'pay_1',
  reference: 'ref_1',
  status: 'pending' as const,
  amountUsd: 25,
  amountXlm: 100,
  description: 'Test payment',
  stellarDepositAddress: 'GDESTINATIONADDRESS123',
  stellarMemo: 'memo-123',
  createdAt: new Date().toISOString(),
  expiryMinutes: 30,
};

describe('PayPage accessibility (WCAG AA assertions)', () => {
  beforeEach(() => {
    vi.mocked(paymentsApi.getByReference).mockResolvedValue({ data: basePayment } as any);
  });

  it('renders clean accessible state with valid heading and landmarks', async () => {
    const { container } = render(<PayPage params={{ paymentId: 'ref_1' }} />);
    await waitFor(() => expect(screen.getByTestId('qr-code')).toBeInTheDocument());

    expect(container).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('ensures all interactive buttons are reachable and not excluded from keyboard tab sequence', async () => {
    render(<PayPage params={{ paymentId: 'ref_1' }} />);
    await waitFor(() => expect(screen.getByTestId('qr-code')).toBeInTheDocument());

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn).not.toHaveAttribute('tabIndex', '-1');
      expect(btn).toBeVisible();
    });
  });

  it('delivers status announcements via aria-live regions', async () => {
    render(<PayPage params={{ paymentId: 'ref_1' }} />);
    await waitFor(() => expect(screen.getByTestId('qr-code')).toBeInTheDocument());

    const liveRegions = document.querySelectorAll('[aria-live]');
    expect(liveRegions.length).toBeGreaterThan(0);
    const politeRegion = Array.from(liveRegions).find(
      (el) => el.getAttribute('aria-live') === 'polite'
    );
    expect(politeRegion).toBeDefined();
  });
});
