/**
 * @file LandingNav.test.tsx
 * @description Comprehensive unit tests for LandingNav component (Issue #380).
 *
 * Covers:
 *  - Renders main navigation with accessibility attributes (aria-label)
 *  - Displays brand name "DupDub"
 *  - Renders desktop navigation links (Login, Get Started)
 *  - Mobile toggle button initial aria-expanded="false" and closed menu
 *  - Toggling mobile menu opens menu, updates aria-expanded to "true"
 *  - Toggling mobile menu again closes menu, updates aria-expanded to "false"
 *  - Clicking mobile navigation links closes mobile menu
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LandingNav } from './LandingNav';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('LandingNav — desktop and accessibility', () => {
  it('renders navigation with accessible label "Main navigation"', () => {
    render(<LandingNav />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders the brand title "DupDub"', () => {
    render(<LandingNav />);
    expect(screen.getByText('DupDub')).toBeInTheDocument();
  });

  it('renders desktop navigation links pointing to correct auth routes', () => {
    render(<LandingNav />);
    const loginLink = screen.getByRole('link', { name: /login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/auth/login');

    const getStartedLink = screen.getByRole('link', { name: /get started/i });
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink).toHaveAttribute('href', '/auth/register');
  });
});

describe('LandingNav — mobile menu interaction', () => {
  it('initializes with mobile toggle button having aria-expanded="false" and no mobile menu', () => {
    render(<LandingNav />);
    const toggleButton = screen.getByRole('button', { name: /toggle menu/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveAttribute('aria-controls', 'landing-mobile-menu');

    expect(document.getElementById('landing-mobile-menu')).toBeNull();
  });

  it('opens mobile menu and sets aria-expanded="true" on click', () => {
    render(<LandingNav />);
    const toggleButton = screen.getByRole('button', { name: /toggle menu/i });

    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    const mobileMenu = document.getElementById('landing-mobile-menu');
    expect(mobileMenu).not.toBeNull();
    expect(mobileMenu).toBeInTheDocument();
  });

  it('closes mobile menu and resets aria-expanded="false" on second click', () => {
    render(<LandingNav />);
    const toggleButton = screen.getByRole('button', { name: /toggle menu/i });

    // Open
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('landing-mobile-menu')).not.toBeNull();

    // Close
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('landing-mobile-menu')).toBeNull();
  });

  it('closes mobile menu when mobile Login link is clicked', () => {
    render(<LandingNav />);
    const toggleButton = screen.getByRole('button', { name: /toggle menu/i });

    fireEvent.click(toggleButton);
    const mobileMenu = document.getElementById('landing-mobile-menu');
    expect(mobileMenu).toBeInTheDocument();

    const mobileLinks = screen.getAllByRole('link', { name: /login/i });
    // mobile link is inside landing-mobile-menu
    const mobileLoginLink = mobileLinks.find((link) => mobileMenu?.contains(link));
    expect(mobileLoginLink).toBeDefined();

    fireEvent.click(mobileLoginLink!);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('landing-mobile-menu')).toBeNull();
  });

  it('closes mobile menu when mobile Get Started link is clicked', () => {
    render(<LandingNav />);
    const toggleButton = screen.getByRole('button', { name: /toggle menu/i });

    fireEvent.click(toggleButton);
    const mobileMenu = document.getElementById('landing-mobile-menu');
    expect(mobileMenu).toBeInTheDocument();

    const mobileLinks = screen.getAllByRole('link', { name: /get started/i });
    const mobileGetStartedLink = mobileLinks.find((link) => mobileMenu?.contains(link));
    expect(mobileGetStartedLink).toBeDefined();

    fireEvent.click(mobileGetStartedLink!);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('landing-mobile-menu')).toBeNull();
  });
});
