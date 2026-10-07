import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/lib/store';
import AdminSettlementsPage from './page';

const mockListSettlements = vi.fn();
const mockRetrySettlement = vi.fn();
const mockApproveSettlement = vi.fn();

vi.mock('@/lib/api', () => ({
  adminApi: {
    listSettlements: (...args: unknown[]) => mockListSettlements(...args),
    retrySettlement: (...args: unknown[]) => mockRetrySettlement(...args),
    approveSettlement: (...args: unknown[]) => mockApproveSettlement(...args),
  },
}));

vi.mock('@/lib/store', () => ({
  useAuthStore: vi.fn(() => ({ token: 'admin-token' })),
}));

const failedSettlement = {
  id: 'settlement-failed-1',
  merchantId: 'merchant-abc12345',
  merchant: { businessName: 'Acme Corp' },
  totalAmountUsd: 100,
  feeAmountUsd: 2,
  netAmountUsd: 98,
  fiatCurrency: 'USD',
  fiatAmount: 98,
  status: 'failed' as const,
  partnerReference: '',
  bankReference: '',
  failureReason: 'Bank timeout',
  requiresApproval: false,
  approvedBy: '',
  approvedAt: '',
  completedAt: '',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const pendingApprovalSettlement = {
  ...failedSettlement,
  id: 'settlement-pending-1',
  status: 'pending_approval' as const,
  failureReason: '',
  requiresApproval: true,
};

type SettlementFixture = Omit<typeof failedSettlement, 'status'> & { status: string };

function mockListResponse(
  settlements: SettlementFixture[] = [failedSettlement, pendingApprovalSettlement],
  total = settlements.length,
) {
  return {
    data: {
      data: settlements,
      total,
      page: 1,
      limit: 20,
      totalPages: Math.ceil(total / 20),
    },
  };
}

/** The shared ConfirmDialog issued for retry/approve confirmations (#354). */
const confirmDialog = () => screen.getByTestId('settlement-confirm-dialog');

describe('AdminSettlementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSettlements.mockResolvedValue(mockListResponse());
    mockRetrySettlement.mockResolvedValue({ data: {} });
    mockApproveSettlement.mockResolvedValue({ data: {} });
  });

  it('fetches settlements via adminApi without duplicating /api/v1 in the path', async () => {
    render(<AdminSettlementsPage />);

    await waitFor(() => {
      expect(mockListSettlements).toHaveBeenCalledWith('page=1&limit=20');
    });
    expect(mockListSettlements.mock.calls[0][0]).not.toMatch(/api\/v1/);
  });

  it('refetches when a filter changes', async () => {
    const user = userEvent.setup();
    render(<AdminSettlementsPage />);

    await waitFor(() => expect(mockListSettlements).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'failed');

    await waitFor(() => {
      expect(mockListSettlements).toHaveBeenCalledWith('page=1&limit=20&status=failed');
    });
    expect(mockListSettlements.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('gives every filter control an accessible name (#352)', async () => {
    render(<AdminSettlementsPage />);

    await waitFor(() => expect(mockListSettlements).toHaveBeenCalled());

    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by merchant ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter from date')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter to date')).toBeInTheDocument();
  });

  it('renders a fallback icon instead of crashing on an unknown status (#353)', async () => {
    mockListSettlements.mockResolvedValue(
      mockListResponse([
        { ...failedSettlement, id: 'settlement-unknown-1', status: 'on_hold', failureReason: '' },
      ]),
    );

    const { container } = render(<AdminSettlementsPage />);

    await waitFor(() => expect(screen.getAllByText('on hold').length).toBeGreaterThan(0));
    // Both render paths (mobile card + desktop table) fall back to HelpCircle.
    expect(container.querySelectorAll('svg.lucide-circle-help').length).toBeGreaterThan(0);
  });

  it('calls retrySettlement with the correct id and shows loading state', async () => {
    let resolveRetry!: () => void;
    mockRetrySettlement.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<AdminSettlementsPage />);

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0));

    const retryButtons = screen.getAllByRole('button', { name: 'Retry' });
    await user.click(retryButtons[0]);

    // The action is held back until the confirmation dialog is accepted (#354).
    expect(mockRetrySettlement).not.toHaveBeenCalled();
    expect(screen.getByText('Retry settlement')).toBeInTheDocument();

    await user.click(within(confirmDialog()).getByRole('button', { name: 'Retry' }));

    expect(mockRetrySettlement).toHaveBeenCalledWith('settlement-failed-1');
    expect(screen.getAllByRole('button', { name: 'Retrying...' })[0]).toBeDisabled();

    resolveRetry();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Retry' })[0]).not.toBeDisabled());
  });

  it('calls approveSettlement with the correct id and shows loading state', async () => {
    let resolveApprove!: () => void;
    mockApproveSettlement.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveApprove = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<AdminSettlementsPage />);

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Approve' }).length).toBeGreaterThan(0),
    );

    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    await user.click(approveButtons[0]);

    expect(mockApproveSettlement).not.toHaveBeenCalled();
    expect(screen.getByText('Approve settlement')).toBeInTheDocument();

    await user.click(within(confirmDialog()).getByRole('button', { name: 'Approve' }));

    expect(mockApproveSettlement).toHaveBeenCalledWith('settlement-pending-1');
    expect(screen.getAllByRole('button', { name: 'Approving...' })[0]).toBeDisabled();

    resolveApprove();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Approve' })[0]).not.toBeDisabled());
  });

  it('does not run a settlement action when the confirmation dialog is cancelled', async () => {
    const user = userEvent.setup();
    render(<AdminSettlementsPage />);

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0));

    await user.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    await user.click(within(confirmDialog()).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('settlement-confirm-dialog')).not.toBeInTheDocument();
    expect(mockRetrySettlement).not.toHaveBeenCalled();
  });

  it('never requests a page below 1 when Previous is clicked (#355)', async () => {
    mockListSettlements.mockResolvedValue(mockListResponse([failedSettlement], 25));

    render(<AdminSettlementsPage />);

    await waitFor(() => expect(mockListSettlements).toHaveBeenCalledWith('page=1&limit=20'));

    const previous = screen.getByRole('button', { name: 'Previous' });
    expect(previous).toBeDisabled();

    // Even if the disabled guard is bypassed, the decrement stays clamped at 1.
    fireEvent.click(previous);
    await waitFor(() => expect(mockListSettlements).toHaveBeenCalledTimes(1));
    expect(mockListSettlements.mock.calls.map((call) => call[0])).toEqual(['page=1&limit=20']);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(mockListSettlements).toHaveBeenCalledWith('page=2&limit=20'));

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(mockListSettlements).toHaveBeenCalledWith('page=1&limit=20'));

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() =>
      expect(mockListSettlements.mock.calls.map((call) => call[0])).toEqual([
        'page=1&limit=20',
        'page=2&limit=20',
        'page=1&limit=20',
      ]),
    );
  });

  it('does not fetch when there is no auth token', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ token: null });

    render(<AdminSettlementsPage />);

    await waitFor(() => expect(mockListSettlements).not.toHaveBeenCalled());

    vi.mocked(useAuthStore).mockReturnValue({ token: 'admin-token' });
  });
});
