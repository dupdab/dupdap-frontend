/**
 * Tests for /pay/[paymentId] page UI states
 * Issue: loading spinner, "Payment not found", and success QR/status UI
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { paymentsApi } from '@/lib/api';
import PayPage from '@/app/pay/[paymentId]/page';

// Mock the API module
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getByReference: jest.fn(),
  },
}));

// Mock qrcode.react (QRCodeSVG renders SVG; easier to stub)
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qrcode" data-value={value} />
  ),
}));

const mockPaymentsApi = paymentsApi as jest.Mocked<typeof paymentsApi>;

/** A minimal payment object that satisfies the page's rendering requirements */
const MOCK_PAYMENT = {
  id: 'pay-001',
  reference: 'REF-001',
  amountUsd: 42.5,
  amountXlm: 100,
  status: 'pending' as const,
  description: 'Test order',
  stellarMemo: 'MEMO123',
  stellarDepositAddress: 'GADDR1234567890',
  createdAt: new Date().toISOString(),
};

const defaultParams = { paymentId: 'REF-001' };

// Pause pending microtasks/timers in a controlled way
function makePendingPromise(): { promise: Promise<unknown>; resolve: (v: unknown) => void } {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('PayPage — UI states', () => {
  it('shows loading spinner while the initial fetch is in-flight', async () => {
    const { promise, resolve } = makePendingPromise();
    // getByReference never resolves during this test
    mockPaymentsApi.getByReference.mockReturnValue(promise as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    // The Loader2 icon renders as an SVG with the animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    resolve({ data: MOCK_PAYMENT });
  });

  it('shows "Payment not found" when the fetch resolves with null data', async () => {
    // Resolve immediately with null to simulate 404 / missing payment
    mockPaymentsApi.getByReference.mockResolvedValue({ data: null } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText('Payment not found')).toBeInTheDocument();
    });
  });

  it('shows "Payment not found" when the fetch rejects', async () => {
    mockPaymentsApi.getByReference.mockRejectedValue(new Error('Network error'));

    render(<PayPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText('Payment not found')).toBeInTheDocument();
    });
  });

  it('shows the QR code and deposit address when a pending payment resolves', async () => {
    mockPaymentsApi.getByReference.mockResolvedValue({ data: MOCK_PAYMENT } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByTestId('qrcode')).toBeInTheDocument();
    });

    expect(screen.getByText(MOCK_PAYMENT.stellarDepositAddress)).toBeInTheDocument();
    expect(screen.getByText(MOCK_PAYMENT.stellarMemo)).toBeInTheDocument();
  });

  it('shows the settled status UI when payment status is settled', async () => {
    const settledPayment = { ...MOCK_PAYMENT, status: 'settled' as const };
    mockPaymentsApi.getByReference.mockResolvedValue({ data: settledPayment } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText('settled', { exact: false })).toBeInTheDocument();
    });

    expect(screen.getByText('Payment complete. Thank you!')).toBeInTheDocument();
  });

  it('shows the failed status UI when payment status is failed', async () => {
    const failedPayment = { ...MOCK_PAYMENT, status: 'failed' as const };
    mockPaymentsApi.getByReference.mockResolvedValue({ data: failedPayment } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText('Payment failed. Please contact the merchant.')).toBeInTheDocument();
    });
  });
});
