import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/app/dashboard/layout';

/**
 * Issue #358: the dashboard layout's active-nav check used a bare
 * `pathname.startsWith(href)`, which highlights a nav item for any route that
 * merely shares its string prefix (e.g. /dashboard/settlements-export). The
 * check must respect path-segment boundaries, trailing slashes, and query
 * strings.
 */

let mockPathname = '/dashboard';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    'aria-current'?: string;
  }) => (
    <a href={href} aria-current={rest['aria-current']}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/store');
const mockUseAuthStore = vi.mocked(useAuthStore);

function stubAuth() {
  const state = {
    token: 'valid-token',
    merchant: { id: 'm1', email: 'a@b.c', businessName: 'Acme Corp', status: 'active' },
    hasHydrated: true,
    logout: vi.fn(),
    setAuth: vi.fn(),
    _setHasHydrated: vi.fn(),
  };
  mockUseAuthStore.mockImplementation((selector?: (s: typeof state) => unknown) =>
    selector ? (selector(state) as ReturnType<typeof useAuthStore>) : (state as never),
  );
}

/** All nav links currently marked as the current page, by their text. */
function currentNavItems(): string[] {
  return screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent?.trim() ?? '');
}

describe('DashboardLayout — nav active state (#358)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard';
    stubAuth();
  });

  afterEach(cleanup);

  const renderAt = (pathname: string) => {
    mockPathname = pathname;
    render(
      <DashboardLayout>
        <div data-testid="child-content">Content</div>
      </DashboardLayout>,
    );
  };

  it('marks only the exact "Overview" item on /dashboard', () => {
    renderAt('/dashboard');
    expect(currentNavItems()).toEqual(['Overview']);
  });

  it('marks "Settlements" on a settlement detail route', () => {
    renderAt('/dashboard/settlements/abc123');
    expect(currentNavItems()).toEqual(['Settlements']);
  });

  it('does not mark "Settlements" for a sibling route sharing the prefix (#358)', () => {
    renderAt('/dashboard/settlements-export');
    expect(currentNavItems()).toEqual([]);
  });

  it('does not mark "Settings" for /dashboard/settings-advanced (#358)', () => {
    renderAt('/dashboard/settings-advanced');
    expect(currentNavItems()).toEqual([]);
  });

  it('tolerates a trailing slash and a query string (#358)', () => {
    renderAt('/dashboard/payments/?tab=open');
    expect(currentNavItems()).toEqual(['Payments']);
  });

  it('does not mark "Admin Settlements" for a non-admin merchant on the admin route', () => {
    renderAt('/dashboard/admin/settlements');
    // The link is filtered out of the nav entirely for non-admin merchants.
    expect(screen.queryByText('Admin Settlements')).not.toBeInTheDocument();
  });
});
