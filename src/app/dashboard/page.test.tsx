import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { paymentsApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    list: jest.fn(),
    stats: jest.fn(),
  },
}));

const mockedList = paymentsApi.list as jest.Mock;
const mockedStats = paymentsApi.stats as jest.Mock;

const stats = {
  total: 3,
  totalAmount: 300,
  pending: 1,
  completed: 2,
};

const payments = [
  {
    id: 'p1',
    amount: 100,
    currency: 'USD',
    status: 'completed',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    amount: 200,
    currency: 'USD',
    status: 'pending',
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DashboardPage', () => {
  it('renders the loading state while fetching', () => {
    mockedList.mockReturnValue(new Promise(() => {}));
    mockedStats.mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders the error state when fetching fails', async () => {
    mockedList.mockRejectedValue(new Error('boom'));
    mockedStats.mockRejectedValue(new Error('boom'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('renders the empty state when there are no payments', async () => {
    mockedList.mockResolvedValue({ data: [], total: 0 });
    mockedStats.mockResolvedValue({ total: 0, totalAmount: 0, pending: 0, completed: 0 });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no payments/i)).toBeInTheDocument();
    });
  });

  it('renders the populated state with summary stats and recent payments', async () => {
    mockedList.mockResolvedValue({ data: payments, total: payments.length });
    mockedStats.mockResolvedValue(stats);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('p1')).toBeInTheDocument();
    });

    expect(screen.getByText('p2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders a payment with an unrecognized status without crashing', async () => {
    const unknownStatusPayment = {
      id: 'p3',
      amount: 50,
      currency: 'USD',
      status: 'refunded',
      createdAt: '2024-01-03T00:00:00.000Z',
    };

    mockedList.mockResolvedValue({ data: [unknownStatusPayment], total: 1 });
    mockedStats.mockResolvedValue({ total: 1, totalAmount: 50, pending: 0, completed: 0 });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('p3')).toBeInTheDocument();
    });

    expect(screen.getByText('refunded')).toBeInTheDocument();
  });
});
