import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

function mockListResponse(settlements = [failedSettlement, pendingApprovalSettlement]) {
  return {
    data: {
      data: settlements,
      total: settlements.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };
}

describe('AdminSettlementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSettlements.mockResolvedValue(mockListResponse());
    mockRetrySettlement.mockResolvedValue({ data: {} });
    mockApproveSettlement.mockResolvedValue({ data: {} });
    vi.stubGlobal('confirm', vi.fn(() => true));
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

    expect(mockApproveSettlement).toHaveBeenCalledWith('settlement-pending-1');
    expect(screen.getAllByRole('button', { name: 'Approving...' })[0]).toBeDisabled();

    resolveApprove();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Approve' })[0]).not.toBeDisabled());
  });

  it('does not fetch when there is no auth token', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ token: null });

    render(<AdminSettlementsPage />);

    await waitFor(() => expect(mockListSettlements).not.toHaveBeenCalled());

    vi.mocked(useAuthStore).mockReturnValue({ token: 'admin-token' });
  });
});
