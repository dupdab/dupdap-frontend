/**
 * @file settlement-detail.test.tsx
 * @description Tests for the settlement detail page status badge (Issue #342).
 *
 * The page must use the shared STATUS_COLORS map from @/lib/utils so that every
 * status the settlements list renders (pending_approval, settling, settled,
 * confirmed, expired) also gets its semantic color on the detail page, instead
 * of silently falling back to the neutral gray badge.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { STATUS_COLORS } from '@/lib/utils';
import SettlementDetailPage from './page';

/* ── Mocks ──────────────────────────────────────────────────────────────── */

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Builds a settlement payload with the given status. */
const settlementWithStatus = (status: string) => ({
  id: 'stl_1234567890',
  status,
  totalAmountUsd: 100,
  feeAmountUsd: 1,
  netAmountUsd: 99,
  createdAt: '2024-01-15T12:00:00Z',
});

describe('SettlementDetailPage — status badge colors (#342)', () => {
  it.each([
    'pending',
    'pending_approval',
    'processing',
    'settling',
    'settled',
    'completed',
    'confirmed',
    'failed',
    'expired',
  ])('renders the shared STATUS_COLORS styling for "%s"', async (status) => {
    mockGet.mockResolvedValue({ data: settlementWithStatus(status) });

    render(<SettlementDetailPage params={{ settlementId: 'stl_1234567890' }} />);

    const badge = await screen.findByText(status);
    // Split the expected classes: one is the pill's own layout, the shared map
    // supplies the semantic status colors.
    STATUS_COLORS[status].split(' ').forEach((cls) => {
      expect(badge.className).toContain(cls);
    });
  });

  it('renders pending_approval with the distinct orange badge, not the gray fallback', async () => {
    mockGet.mockResolvedValue({ data: settlementWithStatus('pending_approval') });

    render(<SettlementDetailPage params={{ settlementId: 'stl_1234567890' }} />);

    const badge = await screen.findByText('pending_approval');
    expect(badge.className).toContain('bg-orange-100');
    expect(badge.className).not.toContain('bg-gray-100');
  });

  it('falls back to neutral gray for an unknown status', async () => {
    mockGet.mockResolvedValue({ data: settlementWithStatus('some_new_status') });

    render(<SettlementDetailPage params={{ settlementId: 'stl_1234567890' }} />);

    const badge = await screen.findByText('some_new_status');
    expect(badge.className).toContain('bg-gray-100');
  });
});
