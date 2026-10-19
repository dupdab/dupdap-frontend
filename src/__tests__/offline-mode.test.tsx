import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineBanner } from '@/components/OfflineBanner';
import PaymentsPage from '@/app/dashboard/payments/page';
import { paymentsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/components/Modal', () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock('@/components/FormField', () => ({
  FormField: ({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: React.ReactNode;
  }) => (
    <label>
      {label}
      <input {...props} />
      {hint}
    </label>
  ),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-svg" data-qr-value={value} />,
}));

function setBrowserOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(paymentsApi.list).mockResolvedValue({
    data: { payments: [], total: 0 },
  } as never);
});

afterEach(() => {
  setBrowserOnline(true);
});

describe('offline mode (#547)', () => {
  it('shows a "You are offline" banner while disconnected and hides it on reconnect', () => {
    setBrowserOnline(false);

    render(<OfflineBanner />);

    const banner = screen.getByTestId('offline-banner');
    expect(banner).toHaveTextContent('You are offline');
    expect(banner).toHaveAttribute('role', 'status');

    act(() => setBrowserOnline(true));
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });

  it('disables the create-payment submit button and blocks the request while offline', async () => {
    setBrowserOnline(false);

    render(<PaymentsPage />);
    await waitFor(() => expect(paymentsApi.list).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('new-payment-button'));
    const submit = screen.getByTestId('create-payment-submit');
    expect(submit).toBeDisabled();

    fireEvent.submit(submit.closest('form')!);
    expect(paymentsApi.create).not.toHaveBeenCalled();
  });

  it('re-enables the create-payment submit button once back online', async () => {
    setBrowserOnline(false);

    render(<PaymentsPage />);
    await waitFor(() => expect(paymentsApi.list).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('new-payment-button'));
    expect(screen.getByTestId('create-payment-submit')).toBeDisabled();

    act(() => setBrowserOnline(true));

    expect(screen.getByTestId('create-payment-submit')).toBeEnabled();
  });
});
