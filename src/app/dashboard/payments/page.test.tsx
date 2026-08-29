import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentsPage from './page';
import { paymentsApi } from '@/lib/api';
import type { Payment } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code" />,
}));

const basePayment: Payment = {
  id: 'pay-1',
  reference: 'REF-001',
  amountUsd: 25,
  status: 'pending',
  stellarMemo: 'MEMO123',
  stellarDepositAddress: 'GABCDEF1234567890',
  qrCode: 'stellar:pay',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function mockListResponse(payments: Payment[], total: number) {
  vi.mocked(paymentsApi.list).mockResolvedValue({
    data: { payments, total },
  } as Awaited<ReturnType<typeof paymentsApi.list>>);
}

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListResponse([], 0);
  });

  it('disables Prev on page 1', async () => {
    mockListResponse([basePayment], 45);

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    });
    expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
  });

  it('disables Next on the last page', async () => {
    mockListResponse([basePayment], 25);

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('pagination-next'));

    await waitFor(() => {
      expect(paymentsApi.list).toHaveBeenCalledWith(2, 20);
    });

    await waitFor(() => {
      expect(screen.getByTestId('pagination-next')).toBeDisabled();
    });
    expect(screen.getByTestId('pagination-prev')).not.toBeDisabled();
  });

  it('submits the create-payment form with parsed numeric fields', async () => {
    const createdPayment = { ...basePayment, id: 'pay-new', reference: 'REF-NEW', amountUsd: 12.5 };
    vi.mocked(paymentsApi.create).mockResolvedValue({
      data: createdPayment,
    } as Awaited<ReturnType<typeof paymentsApi.create>>);

    render(<PaymentsPage />);

    await userEvent.click(screen.getByTestId('new-payment-button'));

    const modal = await screen.findByTestId('create-payment-modal');
    const fields = within(modal);

    await userEvent.type(fields.getByLabelText('Amount (USD)'), '12.50');
    await userEvent.type(fields.getByLabelText('Description (optional)'), 'Test invoice');
    await userEvent.type(fields.getByLabelText('Customer Email (optional)'), 'buyer@example.com');
    await userEvent.clear(fields.getByLabelText('Expires in (minutes)'));
    await userEvent.type(fields.getByLabelText('Expires in (minutes)'), '60');
    await userEvent.click(fields.getByTestId('create-payment-submit'));

    await waitFor(() => {
      expect(paymentsApi.create).toHaveBeenCalledWith({
        amountUsd: 12.5,
        description: 'Test invoice',
        customerEmail: 'buyer@example.com',
        expiryMinutes: 60,
      });
    });
  });

  it('clears the form and shows the QR modal after a successful create', async () => {
    const createdPayment = { ...basePayment, id: 'pay-new', reference: 'REF-NEW' };
    vi.mocked(paymentsApi.create).mockResolvedValue({
      data: createdPayment,
    } as Awaited<ReturnType<typeof paymentsApi.create>>);

    render(<PaymentsPage />);

    await userEvent.click(screen.getByTestId('new-payment-button'));

    const modal = await screen.findByTestId('create-payment-modal');
    const fields = within(modal);

    await userEvent.type(fields.getByLabelText('Amount (USD)'), '10');
    await userEvent.click(fields.getByTestId('create-payment-submit'));

    await waitFor(() => {
      expect(screen.queryByTestId('create-payment-modal')).not.toBeInTheDocument();
    });

    const qrModal = await screen.findByTestId('payment-qr-modal');
    expect(within(qrModal).getByText('REF-NEW')).toBeInTheDocument();
    expect(within(qrModal).getByTestId('qr-code')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('new-payment-button'));
    const reopenedModal = await screen.findByTestId('create-payment-modal');
    expect(within(reopenedModal).getByLabelText('Amount (USD)')).toHaveValue('');
  });
});
