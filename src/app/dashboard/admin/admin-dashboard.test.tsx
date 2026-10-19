/**
 * Tests for /dashboard/admin/page.tsx — the admin dashboard index page.
 *
 * Issue: the /dashboard/admin route existed in the README architecture but had
 * no implementation; internal admins had no dashboard landing page.
 *
 * Coverage:
 * - Page renders an "Admin Dashboard" heading
 * - Page includes a link to the Settlements admin tool
 * - Page does not expose a link to non-admin routes
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboardPage from '@/app/dashboard/admin/page';

// next/link is mocked globally in src/__mocks__/next/link.tsx but we need it
// to work here — the global mock renders a plain <a> which is fine.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('AdminDashboardPage', () => {
  it('renders an "Admin Dashboard" heading', () => {
    render(<AdminDashboardPage />);
    expect(
      screen.getByRole('heading', { name: /admin dashboard/i }),
    ).toBeInTheDocument();
  });

  it('includes a link to the admin settlements page', () => {
    render(<AdminDashboardPage />);
    const link = screen.getByRole('link', { name: /settlements/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/settlements');
  });

  it('shows a description for the settlements tool', () => {
    render(<AdminDashboardPage />);
    // The card description mentions review/approve/retry
    expect(screen.getByText(/review.*approve.*retry/i)).toBeInTheDocument();
  });

  it('renders a list of tool cards', () => {
    render(<AdminDashboardPage />);
    // The tool cards are rendered in a <ul role="list">
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(1);
  });

  it('does not link to non-admin merchant routes like /dashboard/payments', () => {
    render(<AdminDashboardPage />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).not.toContain('/dashboard/payments');
    expect(hrefs).not.toContain('/dashboard/settings');
  });
});
