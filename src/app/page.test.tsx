/**
 * @file page.test.tsx
 * @description Smoke tests and schema assertions for the marketing landing page (Issue #380).
 *
 * Covers:
 *  - Renders without throwing errors
 *  - Includes valid JSON in its application/ld+json script tag with correct schema
 *  - Renders hero headline, subheadline, and main CTA buttons
 *  - Renders feature cards (Why DupDub?)
 *  - Renders step-by-step onboarding guide (How it works)
 *  - Renders footer with copyright text
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LandingPage from './page';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('LandingPage — smoke test & rendering', () => {
  it('renders landing page without throwing', () => {
    expect(() => render(<LandingPage />)).not.toThrow();
  });

  it('renders valid structured JSON-LD in application/ld+json script tag', () => {
    render(<LandingPage />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(script?.textContent).toBeTruthy();

    const parsed = JSON.parse(script!.textContent || '{}');
    expect(parsed).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'DupDub',
      description: 'Crypto-to-fiat settlement platform bridging Web3 payments with traditional banking.',
      url: 'https://dupdub.com',
    });
  });

  it('renders hero title, badge, and primary action buttons', () => {
    render(<LandingPage />);

    // Powered by Stellar badge
    expect(screen.getByText(/powered by stellar network/i)).toBeInTheDocument();

    // Main H1 heading
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /accept crypto,\s*receive fiat — instantly/i,
      }),
    ).toBeInTheDocument();

    // CTA links
    const registerLinks = screen.getAllByRole('link', { name: /start accepting payments/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute('href', '/auth/register');

    const waitlistLink = screen.getByRole('link', { name: /join waitlist/i });
    expect(waitlistLink).toBeInTheDocument();
    expect(waitlistLink).toHaveAttribute('href', '/waitlist');
  });

  it('renders the "Why DupDub?" features section with 4 feature items', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 2, name: /why dupdub\?/i })).toBeInTheDocument();

    expect(screen.getByText('QR Code Payments')).toBeInTheDocument();
    expect(screen.getByText('Instant Settlement')).toBeInTheDocument();
    expect(screen.getByText('Non-Custodial')).toBeInTheDocument();
    expect(screen.getByText('Cross-Border')).toBeInTheDocument();
  });

  it('renders the "How it works" three-step guide', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 2, name: /how it works/i })).toBeInTheDocument();

    expect(screen.getByText('Create payment')).toBeInTheDocument();
    expect(screen.getByText('Customer approves + deposits')).toBeInTheDocument();
    expect(screen.getByText('Receive fiat')).toBeInTheDocument();
  });

  it('renders the bottom CTA section and footer', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 2, name: /ready to get started\?/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create free account/i })).toHaveAttribute('href', '/auth/register');

    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} DupDub. Built with Stellar.`, 'i'))).toBeInTheDocument();
  });
});
