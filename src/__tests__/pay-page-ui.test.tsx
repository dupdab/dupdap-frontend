/**
 * Tests for /pay/[paymentId] page UI states
 * Issue: loading spinner, "Payment not found", and success QR/status UI
 * Issue #310: countdown timer must not re-render the whole page every tick
 * Issue #545: Download QR button (SVG + optional PNG 512x512)
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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

const mockedGetByReference = vi.mocked(paymentsApi.getByReference);

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

describe('PayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the payment amount', async () => {
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);
    await waitFor(() => expect(screen.getByText('$25.00')).toBeInTheDocument());
  });

  it('builds the expected web+stellar URI for the QR code', async () => {
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    const qr = await screen.findByTestId('qr-code');
    expect(qr).toHaveAttribute(
      'data-value',
      'web+stellar:pay?destination=GDESTINATIONADDRESS123&amount=100&memo=memo-123&memo_type=text'
    );
  });

  it('encodeURIComponent-escapes special characters in the memo', async () => {
    mockedGetByReference.mockResolvedValue({
      data: { ...basePayment, stellarMemo: 'memo with spaces & symbols/+=?' },
    } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    const qr = await screen.findByTestId('qr-code');
    expect(qr).toHaveAttribute(
      'data-value',
      'web+stellar:pay?destination=GDESTINATIONADDRESS123&amount=100&memo=memo%20with%20spaces%20%26%20symbols%2F%2B%3D%3F&memo_type=text'
    );
  });

  it('does not render the QR code or deep link when amountXlm is missing', async () => {
    mockedGetByReference.mockResolvedValue({
      data: { ...basePayment, amountXlm: undefined },
    } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await waitFor(() => expect(screen.getByText('$25.00')).toBeInTheDocument());
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('renders a Download QR button below the QR code (#545)', async () => {
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await screen.findByTestId('qr-code');
    expect(screen.getByRole('button', { name: /download qr/i })).toBeInTheDocument();
  });

  it('downloads the QR code as payment-[reference].svg (#545)', async () => {
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<PayPage params={{ paymentId: 'ref_1' }} />);
    await screen.findByTestId('qr-code');

    fireEvent.click(screen.getByRole('button', { name: /download qr/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('isolates the countdown tick so the QR subtree is not re-rendered every second (#310)', async () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    mockedGetByReference.mockResolvedValue({ data: { ...basePayment, expiresAt } } as never);

    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    // Capture the QR node identity; it must survive countdown ticks untouched.
    const qrBefore = screen.getByTestId('qr-code');

    // Advance several 1-second ticks of the countdown interval. Fake timers
    // are installed only now: `waitFor` above must be able to poll on real
    // timers to see the initial render settle.
    act(() => {
      vi.useFakeTimers();
      vi.advanceTimersByTime(3000);
    });

    // The countdown label updates...
    expect(screen.getByText(/Expires in/)).toBeInTheDocument();

    // ...but the QR subtree is the same DOM node (not re-created by a page-wide re-render).
    expect(screen.getByTestId('qr-code')).toBe(qrBefore);

    vi.useRealTimers();
  });
});
