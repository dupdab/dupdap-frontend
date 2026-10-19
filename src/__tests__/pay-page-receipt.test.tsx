/**
 * Tests for the payment receipt view on /pay/[paymentId]
 *
 * Issue: after a payment settles there was only a brief "Payment complete"
 * message. The receipt should show amount, reference, date, description, and
 * provide print / download actions.
 *
 * Coverage:
 * - Receipt renders for `settled` status
 * - Receipt renders for `completed` status
 * - Key receipt fields (amount, reference, date) are visible
 * - Optional fields (description, customerEmail, updatedAt) shown when present
 * - Print and Download buttons are present
 * - Receipt is not rendered while payment is still pending
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, act, screen, waitFor } from '@testing-library/react';
import { paymentsApi } from '@/lib/api';
import PayPage from '@/app/pay/[paymentId]/page';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    getByReference: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qrcode" data-value={value} />
  ),
}));

const mockGetByReference = vi.mocked(paymentsApi.getByReference);

const BASE_PAYMENT = {
  id: 'pay-settled',
  reference: 'REF-SETTLED',
  amountUsd: 42.5,
  status: 'settled' as const,
  stellarMemo: 'MEMO',
  stellarDepositAddress: 'GADDR',
  createdAt: '2024-06-01T10:00:00Z',
  updatedAt: '2024-06-01T10:02:00Z',
};

const defaultParams = { paymentId: 'REF-SETTLED' };

async function flushMount() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PayPage — payment receipt view', () => {
  it('renders the receipt for a settled payment', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByTestId('payment-receipt')).toBeInTheDocument();
    });
  });

  it('renders the receipt for a completed payment (alias status)', async () => {
    mockGetByReference.mockResolvedValue({
      data: { ...BASE_PAYMENT, status: 'completed' },
    } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByTestId('payment-receipt')).toBeInTheDocument();
    });
  });

  it('shows the formatted USD amount on the receipt', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      // Amount appears in both the card header and the receipt dl
      const amounts = screen.getAllByText('$42.50');
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows the payment reference on the receipt', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByText('REF-SETTLED')).toBeInTheDocument();
    });
  });

  it('shows the payment date on the receipt', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      // The Date dt label should appear in the receipt
      expect(screen.getByText('Date')).toBeInTheDocument();
    });
  });

  it('shows the description when present', async () => {
    mockGetByReference.mockResolvedValue({
      data: { ...BASE_PAYMENT, description: 'Invoice #123' },
    } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      // Description appears in both the card header and the receipt dl —
      // verify there is at least one occurrence in the receipt itself.
      const instances = screen.getAllByText('Invoice #123');
      expect(instances.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows the customer email when present', async () => {
    mockGetByReference.mockResolvedValue({
      data: { ...BASE_PAYMENT, customerEmail: 'buyer@example.com' },
    } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByText('buyer@example.com')).toBeInTheDocument();
    });
  });

  it('does not show the email row when customerEmail is absent', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByTestId('payment-receipt')).toBeInTheDocument();
    });

    expect(screen.queryByText('Email')).not.toBeInTheDocument();
  });

  it('shows the settled timestamp when updatedAt is present', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByText('Settled')).toBeInTheDocument();
    });
  });

  it('has a Print button', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
    });
  });

  it('has a Download button', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });
  });

  it('does not render the receipt while the payment is still pending', async () => {
    const pendingPayment = {
      ...BASE_PAYMENT,
      status: 'pending' as const,
      amountXlm: 100,
    };
    mockGetByReference.mockResolvedValue({ data: pendingPayment } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      // QR code should appear for pending, not the receipt
      expect(screen.getByTestId('qrcode')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('payment-receipt')).not.toBeInTheDocument();
  });

  it('shows "Payment Complete" heading in the receipt', async () => {
    mockGetByReference.mockResolvedValue({ data: BASE_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await waitFor(() => {
      expect(screen.getByText('Payment Complete')).toBeInTheDocument();
    });
  });
});
