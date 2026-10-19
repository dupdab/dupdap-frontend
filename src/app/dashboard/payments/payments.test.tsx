import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('PaymentsPage — Description character limit and counter (#396)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentsApi.list).mockResolvedValue({
      data: {
        payments: [
          {
            id: 'pay_1',
            reference: 'PAY-001',
            amountUsd: 50,
            status: 'completed',
            createdAt: '2026-09-25T10:00:00Z',
          },
        ],
        total: 1,
      },
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders payments page and list', async () => {
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('PAY-001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders decorative status icons and omits them for unknown statuses', async () => {
    const { container } = render(<PaymentsPage />);

    await screen.findAllByText('completed');
    const statusIcons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(statusIcons).toHaveLength(2);

    vi.mocked(paymentsApi.list).mockResolvedValue({
      data: {
        payments: [{
          id: 'pay_unknown',
          reference: 'PAY-UNKNOWN',
          amountUsd: 25,
          status: 'on_hold',
          createdAt: '2026-09-25T10:00:00Z',
        }],
        total: 1,
      },
    } as any);
    cleanup();
    const unknownRender = render(<PaymentsPage />);

    expect(await screen.findAllByText('on_hold')).toHaveLength(2);
    expect(unknownRender.container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(0);
  });

  it('opens create modal with description maxLength and character counter (#396)', async () => {
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('New Payment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Payment'));

    const descInput = screen.getByLabelText(/Description \(optional\)/i);
    expect(descInput).toBeInTheDocument();
    expect(descInput).toHaveAttribute('maxlength', '255');

    const counter = screen.getByTestId('description-char-counter');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveTextContent('0/255');
  });

  it('updates character counter as user types into description (#396)', async () => {
    render(<PaymentsPage />);

    fireEvent.click(screen.getByText('New Payment'));

    const descInput = screen.getByLabelText(/Description \(optional\)/i);
    fireEvent.change(descInput, { target: { value: 'Invoice #1042 for consultation' } });

    const counter = screen.getByTestId('description-char-counter');
    expect(counter).toHaveTextContent('30/255');
  });
});

describe('PaymentsPage — Keyboard navigation for payment list table (#576)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentsApi.list).mockResolvedValue({
      data: {
        payments: [
          {
            id: 'pay_1',
            reference: 'PAY-001',
            amountUsd: 50,
            status: 'completed',
            createdAt: '2026-09-25T10:00:00Z',
          },
          {
            id: 'pay_2',
            reference: 'PAY-002',
            amountUsd: 75,
            status: 'pending',
            createdAt: '2026-09-26T10:00:00Z',
          },
        ],
        total: 2,
      },
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('exposes rows as focusable with roving tabindex and visible focus style', async () => {
    render(<PaymentsPage />);

    const rows = await screen.findAllByRole('row', { name: /PAY-00/ });
    expect(rows.length).toBeGreaterThanOrEqual(2);

    // First row is the tab stop; others are not in the tab order.
    expect(rows[0]).toHaveAttribute('tabindex', '0');
    expect(rows[1]).toHaveAttribute('tabindex', '-1');

    // Focus style is applied via a focus-visible class.
    expect(rows[0].className).toMatch(/focus-visible/);
  });

  it('navigates rows with ArrowDown and ArrowUp', async () => {
    render(<PaymentsPage />);

    const rows = await screen.findAllByRole('row', { name: /PAY-00/ });
    rows[0].focus();
    expect(rows[0]).toHaveFocus();

    fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    expect(rows[1]).toHaveFocus();
    expect(rows[1]).toHaveAttribute('tabindex', '0');
    expect(rows[0]).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(rows[1], { key: 'ArrowUp' });
    expect(rows[0]).toHaveFocus();
  });

  it('opens payment detail on Enter', async () => {
    render(<PaymentsPage />);

    const rows = await screen.findAllByRole('row', { name: /PAY-00/ });
    rows[0].focus();

    fireEvent.keyDown(rows[0], { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toHaveTextContent('PAY-001');
  });

  it('moves focus to action buttons within the focused row on Tab', async () => {
    render(<PaymentsPage />);

    const rows = await screen.findAllByRole('row', { name: /PAY-00/ });
    rows[0].focus();

    fireEvent.keyDown(rows[0], { key: 'Tab' });

    const actionButton = rows[0].querySelector('button');
    expect(actionButton).not.toBeNull();
    expect(actionButton).toHaveFocus();
  });
});

describe('PaymentsPage — Amount range filter (#578)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentsApi.list).mockResolvedValue({
      data: {
        payments: [
          {
            id: 'pay_1',
            reference: 'PAY-001',
            amountUsd: 50,
            status: 'completed',
            createdAt: '2026-09-25T10:00:00Z',
          },
          {
            id: 'pay_2',
            reference: 'PAY-002',
            amountUsd: 150,
            status: 'completed',
            createdAt: '2026-09-26T10:00:00Z',
          },
          {
            id: 'pay_3',
            reference: 'PAY-003',
            amountUsd: 250,
            status: 'pending',
            createdAt: '2026-09-27T10:00:00Z',
          },
        ],
        total: 3,
      },
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders min and max amount inputs in the filter panel', async () => {
    render(<PaymentsPage />);

    await screen.findAllByText('PAY-001');

    expect(screen.getByLabelText(/min amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max amount/i)).toBeInTheDocument();
  });

  it('filters payments by amount range alongside status and search', async () => {
    render(<PaymentsPage />);

    await screen.findAllByText('PAY-001');

    fireEvent.change(screen.getByLabelText(/min amount/i), { target: { value: '100' } });

    await waitFor(() => {
      expect(screen.queryByText('PAY-001')).not.toBeInTheDocument();
      expect(screen.getAllByText('PAY-002').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PAY-003').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.change(screen.getByLabelText(/max amount/i), { target: { value: '200' } });

    await waitFor(() => {
      expect(screen.getAllByText('PAY-002').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('PAY-003')).not.toBeInTheDocument();
    });
  });

  it('updates URL query params for the amount range', async () => {
    render(<PaymentsPage />);

    await screen.findAllByText('PAY-001');

    fireEvent.change(screen.getByLabelText(/min amount/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/max amount/i), { target: { value: '200' } });

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('minAmount')).toBe('100');
      expect(params.get('maxAmount')).toBe('200');
    });
  });

  it('clears all filters including amount range', async () => {
    render(<PaymentsPage />);

    await screen.findAllByText('PAY-001');

    fireEvent.change(screen.getByLabelText(/min amount/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/max amount/i), { target: { value: '200' } });

    await waitFor(() => {
      expect(screen.queryByText('PAY-001')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }));

    await waitFor(() => {
      expect(screen.getAllByText('PAY-001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText(/min amount/i)).toHaveValue(null);
      expect(screen.getByLabelText(/max amount/i)).toHaveValue(null);
    });
  });
});
