import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Minimal mock setup ────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    getByReference: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <svg data-testid="qr-code" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────

import { paymentsApi } from '@/lib/api';
import type { Payment } from '@/lib/types';

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    reference: 'REF001',
    amountUsd: 25,
    status: 'pending',
    stellarMemo: 'memo-abc',
    stellarDepositAddress: 'GXXX',
    amountXlm: 100,
    createdAt: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
    ...overrides,
  };
}

async function renderPayPage(payment: Payment) {
  vi.mocked(paymentsApi.getByReference).mockResolvedValue({
    data: payment,
  } as never);
  // Lazy import so each test gets a fresh component instance after mock setup.
  const { default: PayPage } = await import('@/app/pay/[paymentId]/page');
  return render(<PayPage params={{ paymentId: payment.reference }} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Payment expiry countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('shows no countdown when the payment has no expiry information', async () => {
    const payment = makePayment(); // no expiresAt / expiryMinutes
    await act(async () => {
      await renderPayPage(payment);
    });
    expect(screen.queryByTestId('expiry-countdown')).not.toBeInTheDocument();
  });

  it('shows the countdown when expiresAt is set in the future', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString(); // 10 min from now
    const payment = makePayment({ expiresAt });
    await act(async () => {
      await renderPayPage(payment);
    });
    const banner = screen.getByTestId('expiry-countdown');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/expires in/i);
  });

  it('shows the countdown using expiryMinutes when expiresAt is absent', async () => {
    // createdAt now, expiryMinutes = 15 → expires 15 min from now
    const payment = makePayment({
      createdAt: new Date().toISOString(),
      expiryMinutes: 15,
    });
    await act(async () => {
      await renderPayPage(payment);
    });
    expect(screen.getByTestId('expiry-countdown')).toBeInTheDocument();
  });

  it('uses amber warning style when less than 5 minutes remain', async () => {
    const expiresAt = new Date(Date.now() + 3 * 60_000).toISOString(); // 3 min
    const payment = makePayment({ expiresAt });
    await act(async () => {
      await renderPayPage(payment);
    });
    const banner = screen.getByTestId('expiry-countdown');
    expect(banner).toHaveTextContent(/expiring soon/i);
    // The amber class should be present
    expect(banner.className).toMatch(/amber/);
  });

  it('shows critical red style when less than 1 minute remains', async () => {
    const expiresAt = new Date(Date.now() + 30_000).toISOString(); // 30 sec
    const payment = makePayment({ expiresAt });
    await act(async () => {
      await renderPayPage(payment);
    });
    const banner = screen.getByTestId('expiry-countdown');
    expect(banner).toHaveTextContent(/expiring in/i);
    expect(banner.className).toMatch(/red/);
  });

  it('shows expired message when expiresAt is in the past', async () => {
    const expiresAt = new Date(Date.now() - 5_000).toISOString(); // 5 sec ago
    const payment = makePayment({ expiresAt });
    await act(async () => {
      await renderPayPage(payment);
    });
    const banner = screen.getByTestId('expiry-countdown');
    expect(banner).toHaveTextContent(/expired/i);
  });

  it('banner has aria-live="polite" for normal expiry states', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const payment = makePayment({ expiresAt });
    await act(async () => {
      await renderPayPage(payment);
    });
    expect(screen.getByTestId('expiry-countdown')).toHaveAttribute(
      'aria-live',
      'polite'
    );
  });

  it('banner has aria-live="assertive" when expired', async () => {
    const expiresAt = new Date(Date.now() - 1_000).toISOString();
    const payment = makePayment({ expiresAt });
    await act(async () => {
      await renderPayPage(payment);
    });
    expect(screen.getByTestId('expiry-countdown')).toHaveAttribute(
      'aria-live',
      'assertive'
    );
  });
});
