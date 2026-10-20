/**
 * Tests for /pay/[paymentId] page UI states
 * Issue: loading spinner, "Payment not found", and success QR/status UI
 * Issue #310: countdown timer must not re-render the whole page every tick
 * Issue #499: Freighter wallet integration (detect, pay, tx hash, QR fallback)
 * Issue #545: Download QR button (SVG + optional PNG 512x512)
 * Issue #579: copy buttons for Stellar memo and deposit address
 * Issue #575: settled status shows a one-shot, reduced-motion-aware success animation
 * Issue #558: expired payment links render a dedicated expired state
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
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
    // Default: no Freighter extension present.
    delete (window as unknown as { freighter?: unknown }).freighter;
  });

  afterEach(() => {
    delete (window as unknown as { freighter?: unknown }).freighter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    expect(
      screen.getByRole('button', { name: /download qr/i })
    ).toBeInTheDocument();
  });

  it('downloads the QR code as payment-[reference].svg (#545)', async () => {
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });

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
    mockedGetByReference.mockResolvedValue({
      data: { ...basePayment, expiresAt },
    } as never);

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

  it('falls back to the QR code when Freighter is not detected (#499)', async () => {
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await screen.findByTestId('qr-code');
    expect(
      screen.queryByRole('button', { name: /pay with freighter/i })
    ).not.toBeInTheDocument();
  });

  it('shows the Pay with Freighter button when the extension is present (#499)', async () => {
    (window as unknown as { freighter: unknown }).freighter = {
      isConnected: vi.fn(),
    };
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    expect(
      await screen.findByRole('button', { name: /pay with freighter/i })
    ).toBeInTheDocument();
  });

  it('copies the Stellar memo to the clipboard and shows a Copied! tooltip (#579)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    const memoCopy = await screen.findByRole('button', {
      name: /copy stellar memo/i,
    });
    fireEvent.click(memoCopy);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('memo-123'));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('copies the Stellar deposit address to the clipboard (#579)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    const addressCopy = await screen.findByRole('button', {
      name: /copy stellar deposit address/i,
    });
    fireEvent.click(addressCopy);

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('GDESTINATIONADDRESS123')
    );
  });

  it('hides the Copied! tooltip after 2 seconds (#579)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);
    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    const memoCopy = await screen.findByRole('button', {
      name: /copy stellar memo/i,
    });

    vi.useFakeTimers();
    fireEvent.click(memoCopy);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('plays a one-shot success animation when the payment is settled (#575)', async () => {
    mockedGetByReference.mockResolvedValue({
      data: { ...basePayment, status: 'settled' },
    } as never);

    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    const animation = await screen.findByTestId('payment-success-animation');
    // Plays once, never loops.
    expect(animation).toHaveAttribute('data-iteration-count', '1');
    expect(animation).toHaveAttribute('data-loop', 'false');
  });

  it('does not render the success animation for non-settled payments (#575)', async () => {
    mockedGetByReference.mockResolvedValue({ data: basePayment } as never);

    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await waitFor(() => expect(screen.getByText('$25.00')).toBeInTheDocument());
    expect(
      screen.queryByTestId('payment-success-animation')
    ).not.toBeInTheDocument();
  });

  it('skips the success animation when prefers-reduced-motion is set (#575)', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    mockedGetByReference.mockResolvedValue({
      data: { ...basePayment, status: 'settled' },
    } as never);

    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await waitFor(() => expect(screen.getByText('$25.00')).toBeInTheDocument());
    expect(
      screen.queryByTestId('payment-success-animation')
    ).not.toBeInTheDocument();
  });

  it('renders a dedicated expired state instead of the QR code (#558)', async () => {
    const expiresAt = new Date(Date.now() - 60 * 1000).toISOString();
    mockedGetByReference.mockResolvedValue({
      data: { ...basePayment, expiresAt },
    } as never);

    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await waitFor(() =>
      expect(screen.getByText(/This payment has expired/i)).toBeInTheDocument()
    );
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('shows merchant contact info and a create-new-payment link when expired (#558)', async () => {
    const expiresAt = new Date(Date.now() - 60 * 1000).toISOString();
    mockedGetByReference.mockResolvedValue({
      data: {
        ...basePayment,
        expiresAt,
        merchantName: 'Acme Store',
        merchantEmail: 'merchant@acme.test',
      },
    } as never);

    render(<PayPage params={{ paymentId: 'ref_1' }} />);

    await waitFor(() =>
      expect(screen.getByText(/This payment has expired/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Acme Store/)).toBeInTheDocument();
    expect(screen.getByText(/merchant@acme.test/)).toBeInTheDocument();

    const newPaymentLink = screen.getByRole('link', {
      name: /create new payment/i,
    });
    expect(newPaymentLink).toHaveAttribute('href', '/dashboard/payments/new');
  });
});
