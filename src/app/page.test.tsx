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
 *  - Renders pricing section with fee tiers, comparison table, FAQ, and CTA (Issue #557)
 *  - Renders footer with copyright text
 *  - Renders the animated payment flow illustration (Issue #573)
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Imported before the landing page so the next/dynamic mock factory (which is
// evaluated when the page module imports next/dynamic) can reference it.
import { PaymentFlowIllustration } from '@/components/PaymentFlowIllustration';

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

// The landing page is a server component that reads the per-request CSP nonce
// via `headers()`. Outside a request scope Next throws, so stub the header
// lookup the way middleware would populate it (#388).
vi.mock('next/headers', () => ({
  headers: () => new Headers({ 'x-nonce': 'test-nonce' }),
}));

// The hero illustration is lazy-loaded via next/dynamic with ssr:false so it
// does not contribute to LCP (#573). In tests we render it eagerly so its
// accessible content is queryable.
vi.mock('next/dynamic', () => ({
  // Render the illustration eagerly so its accessible content is queryable.
  default: () => PaymentFlowIllustration,
}));

beforeEach(() => {
  // jsdom does not implement IntersectionObserver; provide a no-op stub so the
  // illustration can mount without throwing (#573).
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
      description:
        'Crypto-to-fiat settlement platform bridging Web3 payments with traditional banking.',
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
      })
    ).toBeInTheDocument();

    // CTA links
    const registerLinks = screen.getAllByRole('link', {
      name: /start accepting payments/i,
    });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute('href', '/auth/register');

    const waitlistLink = screen.getByRole('link', { name: /join waitlist/i });
    expect(waitlistLink).toBeInTheDocument();
    expect(waitlistLink).toHaveAttribute('href', '/waitlist');
  });

  it('renders the animated payment flow illustration with an accessible label', () => {
    render(<LandingPage />);
    const illustration = screen.getByRole('img', {
      name: /payment flow: merchant qr code to customer wallet to bank account/i,
    });
    expect(illustration).toBeInTheDocument();
  });

  it('renders the "Why DupDub?" features section with 4 feature items', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /why dupdub\?/i })
    ).toBeInTheDocument();

    expect(screen.getByText('QR Code Payments')).toBeInTheDocument();
    expect(screen.getByText('Instant Settlement')).toBeInTheDocument();
    expect(screen.getByText('Non-Custodial')).toBeInTheDocument();
    expect(screen.getByText('Cross-Border')).toBeInTheDocument();
  });

  it('renders the "How it works" three-step guide', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /how it works/i })
    ).toBeInTheDocument();

    expect(screen.getByText('Create payment')).toBeInTheDocument();
    expect(
      screen.getByText('Customer approves + deposits')
    ).toBeInTheDocument();
    expect(screen.getByText('Receive fiat')).toBeInTheDocument();
  });

  it('renders the pricing section with fee tiers', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /pricing/i })
    ).toBeInTheDocument();

    // Standard tier fee
    expect(screen.getByText('1.5%')).toBeInTheDocument();
    // Volume tiers offer lower rates
    expect(screen.getByText('1.0%')).toBeInTheDocument();
    expect(screen.getByText('0.5%')).toBeInTheDocument();
  });

  it('renders the pricing comparison table vs traditional processors', () => {
    render(<LandingPage />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByText(/traditional payment processors/i)
    ).toBeInTheDocument();
  });

  it('renders the pricing FAQ accordion', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /frequently asked questions/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/how are fees calculated/i)).toBeInTheDocument();
  });

  it('renders a CTA within the pricing section', () => {
    render(<LandingPage />);
    const pricingCta = screen.getByRole('link', {
      name: /get started with dupdub/i,
    });
    expect(pricingCta).toHaveAttribute('href', '/auth/register');
  });

  it('renders the bottom CTA section and footer', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /ready to get started\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /create free account/i })
    ).toHaveAttribute('href', '/auth/register');

    expect(
      screen.getByText(
        new RegExp(
          `© ${new Date().getFullYear()} DupDub. Built with Stellar.`,
          'i'
        )
      )
    ).toBeInTheDocument();
  });
});
