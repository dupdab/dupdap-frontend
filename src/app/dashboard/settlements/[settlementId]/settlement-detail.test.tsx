/**
 * @file settlement-detail.test.tsx
 * @description Tests for the settlement detail page.
 *
 * Covers:
 *  - Successful render of detail-only fields
 *  - Rejected fetch handled without an unhandled rejection (#340)
 *  - "Couldn't load" distinguished from "Settlement not found" (#340)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SettlementDetailPage from './page';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  settlementsApi: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const settlement = {
  id: 'settle-1-uuid-1234',
  merchantId: 'merchant-1',
  totalAmountUsd: 100,
  feeAmountUsd: 2,
  netAmountUsd: 98,
  status: 'completed',
  fiatCurrency: 'USD',
  fiatAmount: 98,
  bankReference: 'BANK-REF-1',
  requiresApproval: false,
  approvedBy: 'admin-1',
  approvedAt: '2024-01-16T10:00:00Z',
  completedAt: '2024-01-17T10:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-18T10:00:00Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SettlementDetailPage — success', () => {
  it('renders the settlement id, amounts and detail-only fields', async () => {
    mockGet.mockResolvedValue({ data: settlement });
    render(<SettlementDetailPage params={{ settlementId: 'settle-1-uuid-1234' }} />);

    expect(await screen.findByText('settle-1-uuid-1234')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('-$2.00')).toBeInTheDocument();
    expect(screen.getByText('$98.00')).toBeInTheDocument();
    expect(screen.getByText('BANK-REF-1')).toBeInTheDocument();
    expect(screen.getByText('admin-1')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('settle-1-uuid-1234');
  });
});

describe('SettlementDetailPage — failure handling', () => {
  it('shows a load error and does not throw when the fetch rejects (#340)', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      mockGet.mockRejectedValue(new Error('Network error'));
      render(<SettlementDetailPage params={{ settlementId: 'missing' }} />);

      expect(await screen.findByText(/couldn't load settlement/i)).toBeInTheDocument();
      // The failure must not be misreported as a genuinely missing settlement.
      expect(screen.queryByText('Settlement not found')).not.toBeInTheDocument();
      // Give any stray unhandled rejection a chance to surface.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('shows "Settlement not found" when the API returns no settlement', async () => {
    mockGet.mockResolvedValue({ data: null });
    render(<SettlementDetailPage params={{ settlementId: 'nope' }} />);

    expect(await screen.findByText('Settlement not found')).toBeInTheDocument();
  });
});
