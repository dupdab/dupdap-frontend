/**
 * Tests for the Stellar network degradation banner on /pay/[paymentId]
 *
 * Issue: if the Stellar network or the backend's Horizon connection is down,
 * the customer sees no indication and thinks the payment is processing.
 *
 * Coverage:
 * - Banner is hidden when polling succeeds
 * - Banner appears after DEGRADED_FAILURE_THRESHOLD consecutive poll failures
 * - Banner disappears again once a poll succeeds (network recovery)
 * - Initial load failure also surfaces the degraded-network message
 */
import { render, act, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PayPage from '@/app/pay/[paymentId]/page';
import { paymentsApi } from '@/lib/api';

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

const PENDING_PAYMENT = {
  id: 'pay-001',
  reference: 'REF-001',
  amountUsd: 10,
  amountXlm: 25,
  status: 'pending' as const,
  stellarMemo: 'MEMO',
  stellarDepositAddress: 'GADDR',
  createdAt: new Date().toISOString(),
};

const defaultParams = { paymentId: 'REF-001' };

/** Flush the initial mount fetch and any immediately scheduled microtasks. */
async function flushMount() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Advance fake timers by `ms` and flush the resulting microtasks. */
async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('PayPage — Stellar network degradation banner', () => {
  it('does not show the banner when polling succeeds', async () => {
    mockGetByReference.mockResolvedValue({ data: PENDING_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    // Advance a couple of poll intervals
    await tick(5000);
    await tick(5000);

    expect(screen.queryByTestId('degraded-banner')).not.toBeInTheDocument();
  });

  it('shows the banner after two consecutive poll failures', async () => {
    // Initial load succeeds; subsequent polls fail.
    mockGetByReference
      .mockResolvedValueOnce({ data: PENDING_PAYMENT } as never)
      .mockRejectedValue(new Error('Network error'));

    render(<PayPage params={defaultParams} />);
    await flushMount();

    // 1st failure
    await tick(5000);
    await tick(5000);
    // 2nd failure — crosses the threshold of 2 (backoff from 1st failure = 10s)
    await tick(20000);

    expect(screen.getByTestId('degraded-banner')).toBeInTheDocument();
  });

  it('does not show the banner after only one poll failure', async () => {
    mockGetByReference
      .mockResolvedValueOnce({ data: PENDING_PAYMENT } as never)
      .mockRejectedValueOnce(new Error('Transient error'))
      // Recovery on third call
      .mockResolvedValue({ data: PENDING_PAYMENT } as never);

    render(<PayPage params={defaultParams} />);
    await flushMount();

    // Only one failure so far
    await tick(5000);
    await tick(5000);

    // Banner should not appear yet — threshold not reached.
    expect(screen.queryByTestId('degraded-banner')).not.toBeInTheDocument();
  });

  it('clears the banner when the network recovers', async () => {
    mockGetByReference
      .mockResolvedValueOnce({ data: PENDING_PAYMENT } as never) // initial load
      .mockRejectedValueOnce(new Error('down')) // failure 1
      .mockRejectedValueOnce(new Error('down')) // failure 2 → banner up
      .mockResolvedValue({ data: PENDING_PAYMENT } as never); // recovery

    render(<PayPage params={defaultParams} />);
    await flushMount();

    // Two failures — banner should appear.
    await tick(5000);
    await tick(5000);
    await tick(20000); // wait for backoff and second failure

    // Banner must be up.
    expect(screen.getByTestId('degraded-banner')).toBeInTheDocument();

    // Recovery: next poll succeeds after max backoff.
    await tick(60000);

    expect(screen.queryByTestId('degraded-banner')).not.toBeInTheDocument();
  });

  it('shows a network-specific error message when the initial load itself fails', async () => {
    mockGetByReference.mockRejectedValue(new Error('Horizon down'));

    render(<PayPage params={defaultParams} />);

    // Flush the initial load rejection — no timer advancement needed since
    // the initial fetch failure resolves immediately as a rejected promise.
    await flushMount();

    expect(screen.getByText(/network connection issue/i)).toBeInTheDocument();
  });

  it('banner has role="alert" for screen-reader accessibility', async () => {
    mockGetByReference
      .mockResolvedValueOnce({ data: PENDING_PAYMENT } as never)
      .mockRejectedValue(new Error('down'));

    render(<PayPage params={defaultParams} />);
    await flushMount();

    await tick(5000);
    await tick(5000);
    await tick(20000);

    const banner = screen.getByTestId('degraded-banner');
    expect(banner).toHaveAttribute('role', 'alert');
  });

  it('banner is not shown for settled payments', async () => {
    const settledPayment = { ...PENDING_PAYMENT, status: 'settled' as const };
    mockGetByReference
      .mockResolvedValueOnce({ data: settledPayment } as never)
      .mockRejectedValue(new Error('down'));

    render(<PayPage params={defaultParams} />);
    await flushMount();

    // Even with poll failures, banner should not appear for terminal status.
    await tick(5000);
    await tick(10000);

    expect(screen.queryByTestId('degraded-banner')).not.toBeInTheDocument();
  });
});
