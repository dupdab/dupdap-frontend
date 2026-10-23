/**
 * @file analytics.test.tsx
 * @description Test suite for the Analytics page (Issue #375).
 *
 * The chart components import recharts directly and are lazily loaded via
 * next/dynamic, so this suite exercises loading, error, and data-loaded branches
 * (including sr-only accessibility tables and summary cards) without stubbing
 * the charting library.
 *
 * Covers:
 *  - Analytics heading always visible
 *  - Loading spinner while fetch is in flight
 *  - paymentsApi.stats() called on mount
 *  - Error message rendered when API rejects
 *  - Total Volume and Total Transactions summary cards
 *  - Chart section h2 headings rendered
 *  - sr-only data tables for accessibility
 *  - Empty state: zero totals when stats is empty
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockStats = vi.fn();

const mockTopMerchants = vi.fn();

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    stats: (...args: unknown[]) => mockStats(...args),
    topMerchants: (...args: unknown[]) => mockTopMerchants(...args),
    // RevenueByMethodCard fetches payments independently; a plain resolved
    // response keeps that side effect inert in these tests.
    list: vi.fn().mockResolvedValue({ data: { payments: [], total: 0 } }),
  },
}));

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  formatUsd: (v: number) => `$${Number(v).toFixed(2)}`,
}));

vi.mock('next/dynamic', () => ({
  default: (
    factory: () => Promise<{ default: React.ComponentType<unknown> }>
  ) => {
    let Resolved: React.ComponentType<unknown> | null = null;
    factory().then((m) => {
      Resolved = m.default;
    });
    return function DynamicStub(props: Record<string, unknown>) {
      if (!Resolved) return <div>Loading chart…</div>;
      return <Resolved {...props} />;
    };
  },
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

/* Lazy import AFTER globals are set up */
import AnalyticsPage from './page';

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const statsData = [
  { status: 'completed', count: 10, totalUsd: 5000 },
  { status: 'pending', count: 3, totalUsd: 1200 },
  { status: 'failed', count: 1, totalUsd: 300 },
];

beforeEach(() => {
  // Safe defaults: never-resolving promises keep the page in its loading
  // state unless a test overrides the mocks explicitly.
  mockStats.mockReturnValue(new Promise(() => {}));
  mockTopMerchants.mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe('AnalyticsPage — initial render', () => {
  it('renders Analytics heading', () => {
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<AnalyticsPage />);
    expect(
      screen.getByRole('heading', { name: /analytics/i })
    ).toBeInTheDocument();
  });

  it('shows loading state while API is in flight', () => {
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<AnalyticsPage />);
    // The page shows skeleton cards marked with aria-busy while loading.
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('calls paymentsApi.stats() exactly once on mount', () => {
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<AnalyticsPage />);
    expect(mockStats).toHaveBeenCalledOnce();
  });
});

describe('AnalyticsPage — error state', () => {
  it('renders error message when API call rejects', async () => {
    mockStats.mockRejectedValue(new Error('Network error'));
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(screen.getByText(/couldn't load analytics/i)).toBeInTheDocument()
    );
  });

  it('hides loading state after error', async () => {
    mockStats.mockRejectedValue(new Error('fail'));
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(
        document.querySelector('[aria-busy="true"]')
      ).not.toBeInTheDocument()
    );
  });
});

describe('AnalyticsPage — data loaded', () => {
  it('shows Total Volume card with computed sum', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);
    // 5000 + 1200 + 300 = 6500
    await waitFor(() =>
      expect(screen.getByText('$6500.00')).toBeInTheDocument()
    );
  });

  it('shows Total Transactions card with computed count', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);
    // 10 + 3 + 1 = 14
    await waitFor(() => expect(screen.getByText('14')).toBeInTheDocument());
  });

  it('renders "Total Volume" and "Total Transactions" labels', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(screen.getByText(/total volume/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/total transactions/i)).toBeInTheDocument();
  });

  it('renders chart section headings', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(
        screen.getAllByText(/payment count by status/i, {
          ignore: 'script, style',
        }).length
      ).toBeGreaterThan(0)
    );
    expect(
      screen.getAllByText(/volume by status/i, { ignore: 'script, style' })
        .length
    ).toBeGreaterThan(0);
  });

  it('renders sr-only accessible table with status rows', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);

    // sr-only caption — use { hidden: true } to include visually hidden elements
    await waitFor(() =>
      expect(
        screen.getAllByText('Payment Count by Status', {
          ignore: 'script, style',
        }).length
      ).toBeGreaterThan(0)
    );
    expect(
      screen.getAllByText('completed', { ignore: 'script, style' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('pending', { ignore: 'script, style' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('failed', { ignore: 'script, style' }).length
    ).toBeGreaterThan(0);
  });
});

describe('AnalyticsPage — empty state', () => {
  it('shows $0.00 and count 0 when stats is empty', async () => {
    mockStats.mockResolvedValue({ data: [] });
    render(<AnalyticsPage />);
    await waitFor(() => expect(screen.getByText('$0.00')).toBeInTheDocument());
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
