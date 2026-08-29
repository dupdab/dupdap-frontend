/**
 * Tests for /dashboard/layout.tsx auth guards
 * Issue: all 4 combinations of token × merchant state
 *   - token + merchant   → renders dashboard UI
 *   - token only         → blank render (null), no redirect
 *   - merchant only      → redirects to /auth/login (token missing)
 *   - neither            → redirects to /auth/login
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/app/dashboard/layout';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// We control useAuthStore by mocking the whole store module
jest.mock('@/lib/store');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_MERCHANT = {
  id: 'merchant-1',
  email: 'test@example.com',
  businessName: 'Acme Corp',
  status: 'active',
};

function stubAuth(overrides: { token?: string | null; merchant?: typeof MOCK_MERCHANT | null }) {
  const state = {
    token: overrides.token ?? null,
    merchant: overrides.merchant ?? null,
    logout: jest.fn(),
    setAuth: jest.fn(),
  };
  // useAuthStore is called with a selector fn: useAuthStore(state => state.foo)
  mockUseAuthStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (selector) return selector(state) as ReturnType<typeof useAuthStore>;
    return state as unknown as ReturnType<typeof useAuthStore>;
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('DashboardLayout — auth guards', () => {
  it('[token + merchant] renders the dashboard shell and children', async () => {
    stubAuth({ token: 'valid-token', merchant: MOCK_MERCHANT });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // Children should be visible
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    // Merchant business name should appear in sidebar
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    // Should NOT redirect
    await act(async () => { jest.runAllTimers(); });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[token only, no merchant] returns null (blank render) — no redirect', async () => {
    stubAuth({ token: 'valid-token', merchant: null });

    const { container } = render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // The layout returns null when merchant is missing
    expect(container.firstChild).toBeNull();
    // Children should NOT be rendered
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    // Should NOT redirect (token is present)
    await act(async () => { jest.runAllTimers(); });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[no token, merchant present] redirects to /auth/login', async () => {
    stubAuth({ token: null, merchant: MOCK_MERCHANT });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // The redirect is triggered in a useEffect — flush it
    await act(async () => { jest.runAllTimers(); });

    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('[no token, no merchant] redirects to /auth/login', async () => {
    stubAuth({ token: null, merchant: null });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    await act(async () => { jest.runAllTimers(); });

    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });
});
