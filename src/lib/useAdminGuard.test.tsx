/**
 * Issue #357: admin authorization was enforced only by AdminLayout's
 * useEffect redirect, so a non-admin merchant deep-linking to an admin route
 * mounted the admin route before the redirect fired. The check is now a single
 * shared, render-time gate used by both layouts.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { isAdminPath, useAdminGuard, useAdminRedirect, type AdminGuardStatus } from './useAdminGuard';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/app/dashboard/layout';
import AdminLayout from '@/app/dashboard/admin/layout';

let mockPathname = '/dashboard';
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/store');
const mockUseAuthStore = vi.mocked(useAuthStore);

type StoreState = {
  token: string | null;
  merchant: { id: string; email: string; businessName: string; status: string; role?: string } | null;
  hasHydrated: boolean;
};

function stubAuth(overrides: Partial<StoreState> = {}) {
  const state: StoreState = {
    token: 'valid-token',
    merchant: { id: 'm1', email: 'a@b.c', businessName: 'Acme Corp', status: 'active' },
    hasHydrated: true,
    ...overrides,
  };
  mockUseAuthStore.mockImplementation((selector?: (s: StoreState) => unknown) =>
    selector ? (selector(state) as ReturnType<typeof useAuthStore>) : (state as never),
  );
}

const ADMIN_MERCHANT = {
  id: 'm1',
  email: 'admin@example.com',
  businessName: 'Acme Corp',
  status: 'active',
  role: 'admin',
};

/** Renders the current status from the hook. */
function Probe() {
  const status = useAdminGuard();
  return <div data-testid="status">{status}</div>;
}

describe('isAdminPath', () => {
  it('matches the admin tree and its children', () => {
    expect(isAdminPath('/dashboard/admin')).toBe(true);
    expect(isAdminPath('/dashboard/admin/settlements')).toBe(true);
    expect(isAdminPath('/dashboard/admin/settlements/abc')).toBe(true);
  });

  it('does not match non-admin routes or prefix siblings', () => {
    expect(isAdminPath('/dashboard')).toBe(false);
    expect(isAdminPath('/dashboard/payments')).toBe(false);
    expect(isAdminPath('/dashboard/administration')).toBe(false);
    expect(isAdminPath(null)).toBe(false);
    expect(isAdminPath(undefined)).toBe(false);
  });
});

describe('useAdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard';
  });

  it('reports loading before the store has hydrated', () => {
    stubAuth({ hasHydrated: false });
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('authorizes non-admin routes for any merchant', () => {
    stubAuth();
    mockPathname = '/dashboard/payments';
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('authorized');
  });

  it('authorizes an admin merchant on an admin route', () => {
    stubAuth({ merchant: ADMIN_MERCHANT });
    mockPathname = '/dashboard/admin/settlements';
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('authorized');
  });

  it('marks a non-admin merchant unauthorized on an admin route', () => {
    stubAuth();
    mockPathname = '/dashboard/admin/settlements';
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
  });
});
describe('DashboardLayout — centralized admin gate (#357)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (pathname: string) => {
    mockPathname = pathname;
    return render(
      <DashboardLayout>
        <div data-testid="child-content">Admin Page</div>
      </DashboardLayout>,
    );
  };

  it('never renders the admin children for a non-admin merchant (#357)', () => {
    stubAuth();
    renderAt('/dashboard/admin/settlements');

    // The gate resolves during the first render — no admin content is returned.
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('renders admin children for an admin merchant', () => {
    stubAuth({ merchant: ADMIN_MERCHANT });
    renderAt('/dashboard/admin/settlements');

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not block non-admin routes', () => {
    stubAuth();
    renderAt('/dashboard/payments');

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('AdminLayout — uses the shared guard (#357)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin children for an admin merchant', () => {
    stubAuth({ merchant: ADMIN_MERCHANT });
    mockPathname = '/dashboard/admin/settlements';
    render(
      <AdminLayout>
        <div data-testid="admin-child">Admin Content</div>
      </AdminLayout>,
    );

    expect(screen.getByTestId('admin-child')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not render admin children for a non-admin merchant, and redirects', () => {
    stubAuth();
    mockPathname = '/dashboard/admin/settlements';
    render(
      <AdminLayout>
        <div data-testid="admin-child">Admin Content</div>
      </AdminLayout>,
    );

    expect(screen.queryByTestId('admin-child')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});

describe('useAdminRedirect', () => {
  function RedirectProbe({ status }: { status: AdminGuardStatus }) {
    useAdminRedirect(status);
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects only when unauthorized', () => {
    render(<RedirectProbe status="authorized" />);
    expect(mockReplace).not.toHaveBeenCalled();

    cleanup();
    render(<RedirectProbe status="loading" />);
    expect(mockReplace).not.toHaveBeenCalled();

    cleanup();
    render(<RedirectProbe status="unauthorized" />);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
