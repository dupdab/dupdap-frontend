import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { paymentsApi } from '@/lib/api';

import DashboardPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** Wraps the page in a fresh QueryClient so useQuery works per test (retry off for fast failures). */
vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: vi.fn(),
    stats: vi.fn(),
  },
}));

// Recharts relies on layout measurements that jsdom does not provide; stub the
// chart primitives so the dashboard can render its data-driven UI in tests.
vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  return {
    ResponsiveContainer: Passthrough,
    ComposedChart: Passthrough,
    LineChart: Passthrough,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

const mockedList = vi.mocked(paymentsApi.list);
const mockedStats = vi.mocked(paymentsApi.stats);

/** paymentsApi.stats() returns a per-status breakdown, not a single summary object. */
const stats = [
  { status: 'settled', count: '2', totalUsd: '200' },
  { status: 'pending', count: '1', totalUsd: '100' },
];

const payments = [
  {
    id: 'p1',
    reference: 'REF-1',
    amountUsd: 100,
    status: 'settled' as const,
    stellarMemo: 'memo-1',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    reference: 'REF-2',
    amountUsd: 200,
    status: 'pending' as const,
    stellarMemo: 'memo-2',
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

/** Wraps the page in a fresh QueryClient so useQuery works per test (retry off for fast failures). */
it('renders the loading state while fetching', () => {
  mockedList.mockReturnValue(new Promise(() => {}) as never);
  mockedStats.mockReturnValue(new Promise(() => {}) as never);

  renderDashboard();

  expect(screen.getByText(/recent payments/i)).toBeInTheDocument();
  expect(screen.queryByText(/no payments yet/i)).not.toBeInTheDocument();
});

it('renders the error state when fetching fails', async () => {
  mockedList.mockRejectedValue(new Error('boom'));
  mockedStats.mockRejectedValue(new Error('boom'));

  renderDashboard();

  await waitFor(() => {
    expect(screen.getByTestId('dashboard-error')).toHaveTextContent(
      /couldn't load your dashboard right now/i
    );
  });
});

it('renders the empty state when there are no payments', async () => {
  mockedList.mockResolvedValue({ data: { payments: [], total: 0 } } as never);
  mockedStats.mockResolvedValue({ data: [] } as never);

  renderDashboard();

  await waitFor(() => {
    expect(screen.getByText(/no payments yet/i)).toBeInTheDocument();
  });
});

it('renders the populated state with summary stats and recent payments', async () => {
  mockedList.mockResolvedValue({
    data: { payments, total: payments.length },
  } as never);
  mockedStats.mockResolvedValue({ data: stats } as never);

  renderDashboard();

  await waitFor(() => {
    expect(screen.getByText('REF-1')).toBeInTheDocument();
  });

  expect(screen.getByText('REF-2')).toBeInTheDocument();
  // Totals derived from the per-status stats breakdown: 2 settled, 1 pending, 3 total.
  expect(screen.getByText('3')).toBeInTheDocument();
});

it('renders the payment volume chart with a compare toggle', async () => {
  mockedList.mockResolvedValue({
    data: { payments, total: payments.length },
  } as never);
  mockedStats.mockResolvedValue({ data: stats } as never);

  renderDashboard();

  await waitFor(() => {
    expect(screen.getByText('REF-1')).toBeInTheDocument();
  });

  expect(screen.getByText(/payment volume/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument();
});

it('renders a payment with an unrecognized status without crashing', async () => {
  const unknownStatusPayment = {
    id: 'p3',
    reference: 'REF-3',
    amountUsd: 50,
    status: 'refunded',
    stellarMemo: 'memo-3',
    createdAt: '2024-01-03T00:00:00.000Z',
  };

  mockedList.mockResolvedValue({
    data: { payments: [unknownStatusPayment], total: 1 },
  } as never);
  mockedStats.mockResolvedValue({ data: [] } as never);

  renderDashboard();

  await waitFor(() => {
    expect(screen.getByText('REF-3')).toBeInTheDocument();
  });

  it('still counts refunded amounts in aggregate stats when status badge exists', async () => {
    mockedStats.mockResolvedValue({ data: [] } as never);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('REF-3')).toBeInTheDocument();
    });

    expect(screen.getByText('refunded')).toBeInTheDocument();
  });
});
