import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import DashboardBreadcrumb, { buildBreadcrumbs } from './DashboardBreadcrumb';

let currentPath = '/dashboard/payments/PAY-123';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe('DashboardBreadcrumb', () => {
  it('builds a dynamic trail from the current route', () => {
    expect(buildBreadcrumbs('/dashboard/payments/PAY-123')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Payments', href: '/dashboard/payments' },
      { label: 'PAY-123', href: '/dashboard/payments/PAY-123' },
    ]);
  });

  it('renders an accessible nav landmark with linked ancestors', () => {
    render(<DashboardBreadcrumb />);

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent('Dashboard > Payments > PAY-123');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute(
      'href',
      '/dashboard/payments'
    );
    expect(screen.getByText('PAY-123')).toHaveAttribute('aria-current', 'page');
  });

  it('marks only the final crumb as the current page', () => {
    currentPath = '/dashboard/settings';
    render(<DashboardBreadcrumb />);
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
    currentPath = '/dashboard/payments/PAY-123';
  });
});
