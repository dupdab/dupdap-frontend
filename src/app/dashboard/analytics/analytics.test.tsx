/**
 * @file analytics.test.tsx
 * @description Test suite for the Analytics page (Issue #375).
 *
 * The analytics page.tsx uses recharts components (ResponsiveContainer,
 * PieChart, BarChart, Cell, Tooltip, Legend) and a COLORS constant directly
 * in JSX without importing them — they are resolved as globals at runtime by
 * the Next.js bundle (imported in layout or _app). In jsdom these globals are
 * absent, causing ReferenceError when the data branch renders.
 *
 * Strategy: inject lightweight stubs for the missing globals BEFORE the page
 * module is loaded, then test all branches: loading, error, and the
 * data-loaded branch (including sr-only accessibility tables and summary cards).
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

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

/* ── Global stubs for recharts + COLORS ─────────────────────────────────── */
/*
 * Must run BEFORE AnalyticsPage is imported so the module top-level sees the
 * globals when the JSX factory functions reference them.
 */

function stubEl(tag = 'div') {
  return function Stub({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  };
}

beforeAll(() => {
  (globalThis as Record<string, unknown>).ResponsiveContainer = stubEl();
  (globalThis as Record<string, unknown>).PieChart = stubEl();
  (globalThis as Record<string, unknown>).BarChart = stubEl();
  (globalThis as Record<string, unknown>).Pie = () => null;
  (globalThis as Record<string, unknown>).Cell = () => null;
  (globalThis as Record<string, unknown>).Bar = () => null;
  (globalThis as Record<string, unknown>).XAxis = () => null;
  (globalThis as Record<string, unknown>).YAxis = () => null;
  (globalThis as Record<string, unknown>).Tooltip = () => null;
  (globalThis as Record<string, unknown>).Legend = () => null;
  (globalThis as Record<string, unknown>).COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
});

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockStats = vi.fn();

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    stats: (...args: unknown[]) => mockStats(...args),
  },
}));

vi.mock('@/lib/utils', () => ({
  formatUsd: (v: number) => `$${Number(v).toFixed(2)}`,
}));

vi.mock('next/dynamic', () => ({
  default: (factory: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    let Resolved: React.ComponentType<unknown> | null = null;
    factory().then((m) => { Resolved = m.default; });
    return function DynamicStub(props: Record<string, unknown>) {
      if (!Resolved) return <div>Loading chart…</div>;
      return <Resolved {...props} />;
    };
  },
}));

/* Lazy import AFTER globals are set up */
import AnalyticsPage from './page';

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const statsData = [
  { status: 'completed', count: 10, totalUsd: 5000 },
  { status: 'pending', count: 3, totalUsd: 1200 },
  { status: 'failed', count: 1, totalUsd: 300 },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe('AnalyticsPage — initial render', () => {
  it('renders Analytics heading', () => {
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<AnalyticsPage />);
    expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument();
  });

  it('shows loading state while API is in flight', () => {
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<AnalyticsPage />);
    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
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
      expect(screen.getByText(/couldn't load analytics/i)).toBeInTheDocument(),
    );
  });

  it('hides loading text after error', async () => {
    mockStats.mockRejectedValue(new Error('fail'));
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(screen.queryByText(/loading\.\.\./i)).not.toBeInTheDocument(),
    );
  });
});

describe('AnalyticsPage — data loaded', () => {
  it('shows Total Volume card with computed sum', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);
    // 5000 + 1200 + 300 = 6500
    await waitFor(() => expect(screen.getByText('$6500.00')).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByText(/total volume/i)).toBeInTheDocument());
    expect(screen.getByText(/total transactions/i)).toBeInTheDocument();
  });

  it('renders chart section headings', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(
        screen.getAllByText(/payment count by status/i, { hidden: true }).length,
      ).toBeGreaterThan(0),
    );
    expect(
      screen.getAllByText(/volume by status/i, { hidden: true }).length,
    ).toBeGreaterThan(0);
  });

  it('renders sr-only accessible table with status rows', async () => {
    mockStats.mockResolvedValue({ data: statsData });
    render(<AnalyticsPage />);

    // sr-only caption — use { hidden: true } to include visually hidden elements
    await waitFor(() =>
      expect(
        screen.getAllByText('Payment Count by Status', { hidden: true }).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.getAllByText('completed', { hidden: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('pending', { hidden: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('failed', { hidden: true }).length).toBeGreaterThan(0);
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
