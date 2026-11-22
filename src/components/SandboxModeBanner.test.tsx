import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { isSandboxMode } from '@/lib/sandbox';

import { SandboxModeBanner } from './SandboxModeBanner';

let currentMerchant: { mode?: string; testMode?: boolean; status: string } | null =
  { mode: 'sandbox', status: 'active' };

vi.mock('@/lib/store', () => ({
  useAuthStore: (selector: (state: { merchant: unknown }) => unknown) =>
    selector({ merchant: currentMerchant }),
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

describe('SandboxModeBanner', () => {
  it('shows an amber banner with a settings CTA in sandbox mode', () => {
    render(<SandboxModeBanner />);
    const banner = screen.getByTestId('sandbox-mode-banner');
    expect(banner).toHaveTextContent('Sandbox Mode');
    expect(banner).toHaveTextContent('Switch to production');
    expect(banner.className).toContain('bg-amber-100');
    expect(
      screen.getByRole('link', { name: 'Switch to production' })
    ).toHaveAttribute('href', '/dashboard/settings#environment');
  });

  it('renders nothing for production merchants', () => {
    currentMerchant = { status: 'active' };
    render(<SandboxModeBanner />);
    expect(screen.queryByTestId('sandbox-mode-banner')).toBeNull();
    currentMerchant = { mode: 'sandbox', status: 'active' };
  });

  it('detects sandbox mode from merchant fields', () => {
    expect(isSandboxMode({ status: 'active', testMode: true })).toBe(true);
    expect(isSandboxMode({ status: 'active', mode: 'sandbox' })).toBe(true);
    expect(isSandboxMode({ status: 'active' })).toBe(false);
  });
});
