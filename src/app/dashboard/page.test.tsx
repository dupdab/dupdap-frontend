import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { paymentsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: vi.fn(),
    stats: vi.fn(),
  },
}));

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

describe('DashboardPage', () => {
  it('renders the loading state while fetching', () => {
    mockedList.mockReturnValue(new Promise(() => {}) as never);
    mockedStats.mockReturnValue(new Promise(() => {}) as never);

    render(<DashboardPage />);

    expect(screen.getByText(/recent payments/i)).toBeInTheDocument();
    expect(screen.queryByText(/no payments yet/i)).not.toBeInTheDocument();
  });

  it('renders the error state when fetching fails', async () => {
    mockedList.mockRejectedValue(new Error('boom'));
    mockedStats.mockRejectedValue(new Error('boom'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toHaveTextContent(
        /couldn't load your dashboard right now/i,
      );
    });
  });

  it('renders the empty state when there are no payments', async () => {
    mockedList.mockResolvedValue({ data: { payments: [], total: 0 } } as never);
    mockedStats.mockResolvedValue({ data: [] } as never);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no payments yet/i)).toBeInTheDocument();
    });
  });

  it('renders the populated state with summary stats and recent payments', async () => {
    mockedList.mockResolvedValue({ data: { payments, total: payments.length } } as never);
    mockedStats.mockResolvedValue({ data: stats } as never);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('REF-1')).toBeInTheDocument();
    });

    expect(screen.getByText('REF-2')).toBeInTheDocument();
    // Totals derived from the per-status stats breakdown: 2 settled, 1 pending, 3 total.
    expect(screen.getByText('3')).toBeInTheDocument();
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

    mockedList.mockResolvedValue({ data: { payments: [unknownStatusPayment], total: 1 } } as never);
    mockedStats.mockResolvedValue({ data: [] } as never);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('REF-3')).toBeInTheDocument();
    });

    expect(screen.getByText('refunded')).toBeInTheDocument();
  });
});
