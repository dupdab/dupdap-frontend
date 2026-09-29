/**
 * @file settlements.test.tsx
 * @description Comprehensive test suite for the Settlements list page (Issue #374).
 *
 * Covers:
 *  - Loading skeleton displayed on initial fetch
 *  - Settlements rendered in table rows (desktop) with correct amounts and status
 *  - Empty-state message when no settlements exist
 *  - API error message rendered
 *  - Pagination: Prev/Next buttons and page counter (#338)
 *  - Unknown statuses fall back to the default badge color (#339)
 *  - Settlement IDs rendered as links to detail page
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SettlementsPage from './page';

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockList = vi.fn();

vi.mock('@/lib/api', () => ({
  settlementsApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

/* next/link — render as a plain anchor so href assertions work */
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/components/Skeleton', () => ({
  SkeletonList: ({ rows }: { rows: number }) => (
    <div data-testid="skeleton-list">{Array.from({ length: rows }).map((_, i) => (
      <div key={i} data-testid="skeleton-row" />
    ))}</div>
  ),
  SkeletonTableRows: ({ rows }: { rows: number }) => (
    <tr data-testid="skeleton-table-rows">
      <td colSpan={6}>{rows} skeleton rows</td>
    </tr>
  ),
}));

vi.mock('@/lib/utils', () => ({
  formatUsd: (v: number) => `$${v.toFixed(2)}`,
  formatDate: (s: string) => s.slice(0, 10),
  STATUS_ICONS: {
    pending: (props: { className?: string; 'aria-hidden'?: boolean }) => <svg data-testid="status-icon" {...props} />,
    completed: (props: { className?: string; 'aria-hidden'?: boolean }) => <svg data-testid="status-icon" {...props} />,
    failed: (props: { className?: string; 'aria-hidden'?: boolean }) => <svg data-testid="status-icon" {...props} />,
  },
  STATUS_COLORS: { pending: 'bg-yellow-100', completed: 'bg-green-100', failed: 'bg-red-100' },
  DEFAULT_STATUS_COLOR: 'bg-gray-100 text-gray-600',
}));

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const makeSettlement = (i: number, status = 'completed') => ({
  id: `settle-${i}-uuid-1234`,
  totalAmountUsd: 1000 + i * 100,
  feeAmountUsd: 10 + i,
  netAmountUsd: 990 + i * 99,
  status,
  createdAt: '2024-01-15T10:00:00Z',
});

const twoSettlements = [makeSettlement(1), makeSettlement(2, 'pending')];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe('SettlementsPage — loading state', () => {
  it('shows skeleton table rows while fetching', () => {
    // Never resolves → stays loading
    mockList.mockReturnValue(new Promise(() => {}));
    render(<SettlementsPage />);
    expect(screen.getByTestId('skeleton-table-rows')).toBeInTheDocument();
  });
});

describe('SettlementsPage — list rendering', () => {
  it('renders settlement rows with amounts and status badges', async () => {
    mockList.mockResolvedValue({ data: { settlements: twoSettlements, total: 2 } });
    render(<SettlementsPage />);

    await waitFor(() => expect(screen.queryByTestId('skeleton-table-rows')).not.toBeInTheDocument());

    // Gross amount of first settlement ($1100.00 = 1000 + 1*100)
    expect(screen.getAllByText('$1100.00').length).toBeGreaterThan(0);
    // Net amount
    expect(screen.getAllByText('$1089.00').length).toBeGreaterThan(0);
    // Status badge
    expect(screen.getAllByText('completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pending').length).toBeGreaterThan(0);
    const statusIcons = screen.getAllByTestId('status-icon');
    expect(statusIcons.length).toBeGreaterThan(0);
    statusIcons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });

  it('renders unknown statuses without an icon', async () => {
    mockList.mockResolvedValue({ data: { settlements: [makeSettlement(3, 'on_hold')], total: 1 } });
    render(<SettlementsPage />);

    expect(await screen.findAllByText('on_hold')).toHaveLength(2);
    expect(screen.queryByTestId('status-icon')).not.toBeInTheDocument();
  });

  it('falls back to the default color for unknown statuses (#339)', async () => {
    mockList.mockResolvedValue({ data: { settlements: [makeSettlement(3, 'on_hold')], total: 1 } });
    render(<SettlementsPage />);

    const badges = await screen.findAllByText('on_hold');
    // Both the desktop table row and the mobile card badge must degrade
    // gracefully rather than interpolating the literal string "undefined".
    for (const badge of badges) {
      expect(badge.className).toContain('bg-gray-100 text-gray-600');
      expect(badge.className).not.toContain('undefined');
    }
  });

  it('uses the mapped status color for known statuses', async () => {
    mockList.mockResolvedValue({ data: { settlements: [makeSettlement(3, 'completed')], total: 1 } });
    render(<SettlementsPage />);

    const badges = await screen.findAllByText('completed');
    for (const badge of badges) {
      expect(badge.className).toContain('bg-green-100');
    }
  });

  it('renders settlement ID links to detail page', async () => {
    mockList.mockResolvedValue({ data: { settlements: twoSettlements, total: 2 } });
    render(<SettlementsPage />);

    await waitFor(() => expect(screen.queryByTestId('skeleton-table-rows')).not.toBeInTheDocument());

    const links = screen.getAllByRole('link');
    const detailLink = links.find((l) => l.getAttribute('href')?.includes('/dashboard/settlements/settle-1'));
    expect(detailLink).toBeTruthy();
  });

  it('shows total count in subtitle', async () => {
    mockList.mockResolvedValue({ data: { settlements: twoSettlements, total: 2 } });
    render(<SettlementsPage />);

    await waitFor(() => expect(screen.getByText('2 total settlements')).toBeInTheDocument());
  });
});

describe('SettlementsPage — empty state', () => {
  it('shows "No settlements yet" when list is empty', async () => {
    mockList.mockResolvedValue({ data: { settlements: [], total: 0 } });
    render(<SettlementsPage />);

    await waitFor(() =>
      expect(screen.getAllByText(/no settlements yet/i).length).toBeGreaterThan(0),
    );
  });
});

describe('SettlementsPage — error state', () => {
  it('renders error message when API call fails', async () => {
    mockList.mockRejectedValue(new Error('Network error'));
    render(<SettlementsPage />);

    await waitFor(() =>
      expect(screen.getByText(/couldn't load settlements/i)).toBeInTheDocument(),
    );
  });
});

describe('SettlementsPage — pagination', () => {
  it('shows pagination controls on page 1 when total > 20', async () => {
    // Regression test for #338: the condition used to be written as
    // `total > 20 || page > 1 && (<div>...)`, which parses as
    // `total > 20 || (page > 1 && <div>)`. With page = 1 the right side is
    // false, so the expression short-circuits to the boolean `true` and React
    // renders nothing — hiding the controls exactly when they're needed.
    mockList.mockResolvedValue({
      data: { settlements: [makeSettlement(1)], total: 40 },
    });
    render(<SettlementsPage />);

    expect(await screen.findByTestId('pagination-next')).toBeInTheDocument();
    const prev = screen.getByTestId('pagination-prev');
    expect(prev).toBeDisabled();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('hides pagination controls on page 1 when total <= 20', async () => {
    mockList.mockResolvedValue({
      data: { settlements: [makeSettlement(1)], total: 2 },
    });
    render(<SettlementsPage />);

    await waitFor(() => expect(screen.getByText('2 total settlements')).toBeInTheDocument());
    expect(screen.queryByTestId('pagination-next')).not.toBeInTheDocument();
  });

  it('navigates to the next page when Next is clicked', async () => {
    mockList.mockResolvedValue({
      data: { settlements: [makeSettlement(1)], total: 40 },
    });
    render(<SettlementsPage />);

    fireEvent.click(await screen.findByTestId('pagination-next'));

    await waitFor(() => expect(mockList).toHaveBeenCalledWith(2, 20));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-next')).toBeDisabled();
  });

  it('renders page counter text in subtitle (total always visible)', async () => {
    mockList.mockResolvedValue({
      data: { settlements: [makeSettlement(1)], total: 40 },
    });
    render(<SettlementsPage />);

    await waitFor(() =>
      expect(screen.getByText('40 total settlements')).toBeInTheDocument(),
    );
  });

  it('settlements list calls API with correct page and limit', async () => {
    mockList.mockResolvedValue({
      data: { settlements: [makeSettlement(1)], total: 5 },
    });
    render(<SettlementsPage />);

    await waitFor(() => expect(mockList).toHaveBeenCalledWith(1, 20));
  });
});
