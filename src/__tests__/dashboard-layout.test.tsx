/**
 * Tests for /dashboard/layout.tsx auth guards and hydration lifecycle
 * Issue #401: the layout must not render a blank (null) frame while the
 * client-side redirect is pending — it should render an explicit loading
 * state instead, and still redirect unauthenticated users to /auth/login.
 *
 * Issue #402: the admin layout (/dashboard/admin/layout.tsx) must not render
 * a blank (null) frame while the admin-authorization redirect is pending for
 * non-admin merchants — it should render an explicit loading state instead,
 * and still redirect non-admin merchants to /dashboard.
 *
 * Combinations of token × merchant state:
 *   - token + merchant   → renders dashboard UI
 *   - token only         → renders loading state (no blank flash), no redirect
 *   - merchant only      → redirects to /auth/login (token missing)
 *   - neither            → redirects to /auth/login
 */
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/app/dashboard/layout';
import AdminLayout from '@/app/dashboard/admin/layout';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// We control useAuthStore by mocking the whole store module
vi.mock('@/lib/store');

const mockUseAuthStore = vi.mocked(useAuthStore);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_MERCHANT = {
  id: 'merchant-1',
  email: 'test@example.com',
  businessName: 'Acme Corp',
  status: 'active',
};

const MOCK_ADMIN_MERCHANT = {
  ...MOCK_MERCHANT,
  role: 'admin',
};

function stubAuth(overrides: {
  token?: string | null;
  merchant?: typeof MOCK_MERCHANT | null;
  hasHydrated?: boolean;
}) {
  const state = {
    token: overrides.token ?? null,
    merchant: overrides.merchant ?? null,
    hasHydrated: overrides.hasHydrated ?? true,
    logout: vi.fn(),
    setAuth: vi.fn(),
    _setHasHydrated: vi.fn(),
  };
  mockUseAuthStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (selector) return selector(state) as ReturnType<typeof useAuthStore>;
    return state as unknown as ReturnType<typeof useAuthStore>;
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DashboardLayout — auth guards and hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('[pre-hydration window] renders loading spinner and avoids redirect or children render when hasHydrated is false', async () => {
    stubAuth({ token: 'valid-token', merchant: MOCK_MERCHANT, hasHydrated: false });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // Pre-hydration loading spinner should be visible
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    // Children and sidebar should NOT render
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();

    // No premature redirect should occur
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[token + merchant] renders the dashboard shell and children when hydrated', async () => {
    stubAuth({ token: 'valid-token', merchant: MOCK_MERCHANT, hasHydrated: true });

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
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[token only, no merchant] renders an explicit loading state — no blank flash, no redirect', async () => {
    stubAuth({ token: 'valid-token', merchant: null, hasHydrated: true });

    const { container } = render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // Issue #401: the layout must NOT render null while merchant is missing.
    expect(container.firstChild).not.toBeNull();
    // An explicit loading indicator should be shown instead of blank content.
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Children should NOT be rendered
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    // Should NOT redirect (token is present)
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[no token, merchant present] redirects to /auth/login with next param', async () => {
    stubAuth({ token: null, merchant: MOCK_MERCHANT, hasHydrated: true });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // The redirect is triggered in a useEffect — flush it
    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockPush).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard');
  });

  it('[no token, no merchant] redirects to /auth/login with next param', async () => {
    stubAuth({ token: null, merchant: null, hasHydrated: true });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockPush).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard');
  });
});

describe('AdminLayout — admin authorization guard', () => {
  it('[admin merchant] renders the admin children', async () => {
    stubAuth({ token: 'valid-token', merchant: MOCK_ADMIN_MERCHANT });

    render(
      <AdminLayout>
        <div data-testid="admin-child">Admin Content</div>
      </AdminLayout>,
    );

    expect(screen.getByTestId('admin-child')).toBeInTheDocument();
    await act(async () => { jest.runAllTimers(); });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('[non-admin merchant] renders an explicit loading state — no blank flash — then redirects to /dashboard', async () => {
    stubAuth({ token: 'valid-token', merchant: MOCK_MERCHANT });

    const { container } = render(
      <AdminLayout>
        <div data-testid="admin-child">Admin Content</div>
      </AdminLayout>,
    );

    // Issue #402: the admin layout must NOT render null while the
    // authorization redirect is pending for a non-admin merchant.
    expect(container.firstChild).not.toBeNull();
    // An explicit loading indicator should be shown instead of blank content.
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Admin children should NOT be rendered
    expect(screen.queryByTestId('admin-child')).not.toBeInTheDocument();

    // The redirect is triggered in a useEffect — flush it
    await act(async () => { jest.runAllTimers(); });
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
