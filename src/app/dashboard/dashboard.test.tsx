/**
 * @file dashboard.test.tsx
 * @description Comprehensive test suite for the Dashboard overview page (Issue #382).
 *
 * The page fetches payments (list) and stats simultaneously using Promise.all.
 * It renders four stat cards, a recent payments list, and handles loading/error states.
 *
 * Note: The source uses `DEFAULT_STATUS_COLOR` as a global in JSX without importing it
 * (same pattern as analytics page with recharts). We inject a global stub before import.
 * Also: `PAYMENT_STATUS_COLORS` is imported from utils — mocked below.
 *
 * Covers:
 *  - Welcome heading renders with merchant business name
 *  - Stat cards visible (Total Volume, Settled, Pending, Total Payments)
 *  - Loading skeletons displayed while fetch is in flight
 *  - Recent payments list renders with reference, status, amount
 *  - Empty state "No payments yet" when list is empty
 *  - API error message rendered
 *  - Both APIs called on mount
 */

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

/* ── Global stubs ─────────────────────────────────────────────────────────── */
/* DEFAULT_STATUS_COLOR is used as a global in page.tsx without an import */
beforeAll(() => {
  (globalThis as Record<string, unknown>).DEFAULT_STATUS_COLOR = 'bg-gray-100 text-gray-700';
});

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockList = vi.fn();
const mockStats = vi.fn();

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: (...args: unknown[]) => mockList(...args),
    stats: (...args: unknown[]) => mockStats(...args),
  },
}));

vi.mock('@/lib/store', () => ({
  useAuthStore: () => ({ merchant: { id: 'merch-1', businessName: 'Acme Corp' } }),
}));

vi.mock('@/lib/utils', () => ({
  formatUsd: (v: number) => `$${Number(v).toFixed(2)}`,
  formatDate: (s: string) => s.slice(0, 10),
  PAYMENT_STATUS_COLORS: {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    settled: 'bg-blue-100 text-blue-700',
  },
}));

vi.mock('@/components/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
  SkeletonList: ({ rows }: { rows: number }) => (
    <div data-testid="skeleton-list">{rows} skeleton rows</div>
  ),
}));

vi.mock('lucide-react', () => ({
  TrendingUp: () => <span>TrendingUp</span>,
  CreditCard: () => <span>CreditCard</span>,
  Banknote: () => <span>Banknote</span>,
  Clock: () => <span>Clock</span>,
}));

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const statsData = [
  { status: 'settled', count: 5, totalUsd: 2500 },
  { status: 'pending', count: 3, totalUsd: 1000 },
  { status: 'failed', count: 1, totalUsd: 200 },
];

const makePayment = (i: number, status = 'completed') => ({
  id: `pay-${i}`,
  reference: `REF-00${i}`,
  amountUsd: 100 + i * 10,
  status,
  createdAt: '2024-01-15T10:00:00Z',
  description: `Payment ${i}`,
});

/* Lazy import — after globals are set */
import DashboardPage from './page';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe('DashboardPage — initial render', () => {
  it('renders welcome heading with merchant business name', async () => {
    mockList.mockResolvedValue({ data: { payments: [], total: 0 } });
    mockStats.mockResolvedValue({ data: [] });
    render(<DashboardPage />);
    // Heading may include "Welcome back, " prefix
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(),
    );
    expect(screen.getByText(/acme corp/i)).toBeInTheDocument();
  });

  it('renders all four stat card labels', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    expect(screen.getByText('Total Volume')).toBeInTheDocument();
    expect(screen.getByText('Settled Payments')).toBeInTheDocument();
    expect(screen.getByText('Pending Payments')).toBeInTheDocument();
    expect(screen.getByText('Total Payments')).toBeInTheDocument();
  });

  it('shows skeleton placeholders while APIs are in flight', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    // Stat card skeletons
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    // Recent payments skeleton list
    expect(screen.getByTestId('skeleton-list')).toBeInTheDocument();
  });

  it('calls paymentsApi.list(1, 5) and paymentsApi.stats() on mount', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    mockStats.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    expect(mockList).toHaveBeenCalledWith(1, 5);
    expect(mockStats).toHaveBeenCalledOnce();
  });
});

describe('DashboardPage — data loaded', () => {
  it('renders stat card values after data resolves', async () => {
    mockList.mockResolvedValue({ data: { payments: [], total: 0 } });
    mockStats.mockResolvedValue({ data: statsData });
    render(<DashboardPage />);

    // Total volume = 2500 + 1000 + 200 = 3700
    await waitFor(() => expect(screen.getByText('$3700.00')).toBeInTheDocument());
    // Settled count = 5
    expect(screen.getByText('5')).toBeInTheDocument();
    // Pending count = 3
    expect(screen.getByText('3')).toBeInTheDocument();
    // Total payments = 9
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('renders recent payments with reference, status, and amount', async () => {
    const payments = [makePayment(1, 'completed'), makePayment(2, 'pending')];
    mockList.mockResolvedValue({ data: { payments, total: 2 } });
    mockStats.mockResolvedValue({ data: statsData });
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('REF-001')).toBeInTheDocument());
    expect(screen.getByText('REF-002')).toBeInTheDocument();
    expect(screen.getByText('$110.00')).toBeInTheDocument(); // 100 + 1*10
    expect(screen.getAllByText(/completed|pending/).length).toBeGreaterThan(0);
  });

  it('renders "Recent Payments" section heading', async () => {
    mockList.mockResolvedValue({ data: { payments: [], total: 0 } });
    mockStats.mockResolvedValue({ data: [] });
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText(/recent payments/i)).toBeInTheDocument(),
    );
  });
});

describe('DashboardPage — empty state', () => {
  it('shows "No payments yet" when list is empty', async () => {
    mockList.mockResolvedValue({ data: { payments: [], total: 0 } });
    mockStats.mockResolvedValue({ data: [] });
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText(/no payments yet/i)).toBeInTheDocument(),
    );
  });

  it('shows $0.00 for Total Volume when stats is empty', async () => {
    mockList.mockResolvedValue({ data: { payments: [], total: 0 } });
    mockStats.mockResolvedValue({ data: [] });
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('$0.00')).toBeInTheDocument());
  });
});

describe('DashboardPage — error state', () => {
  it('renders error message when API calls fail', async () => {
    mockList.mockRejectedValue(new Error('Network error'));
    mockStats.mockRejectedValue(new Error('Network error'));
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText(/couldn't load your dashboard/i)).toBeInTheDocument(),
    );
  });
});
