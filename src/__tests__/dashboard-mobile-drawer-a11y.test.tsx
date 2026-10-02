/**
 * Issue #356: the dashboard's mobile off-canvas drawer (the `md:hidden` aside
 * rendered when `mobileNavOpen` is true) had a click-to-close backdrop but no
 * focus trap, no focus move into the drawer on open, and no Escape handler —
 * unlike the app's own Modal/ConfirmDialog components.
 *
 * These tests mount the real layout and assert the drawer behaves as a modal:
 *   - focus moves into the drawer when it opens
 *   - Tab / Shift+Tab cycle within the drawer instead of escaping to the page
 *   - focus is restored to the hamburger button on close
 *   - Escape closes the drawer
 *   - backdrop click closes the drawer
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/app/dashboard/layout';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
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

/** The mobile drawer is the element with role="dialog" (aria-label "Navigation menu"). */
function drawer() {
  return screen.getByRole('dialog', { name: 'Navigation menu' });
}

/** Focusable elements inside the drawer, in DOM order. */
function drawerFocusables() {
  return Array.from(
    drawer().querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
  );
}

function openDrawer() {
  render(
    <DashboardLayout>
      <div data-testid="child-content">Content</div>
    </DashboardLayout>,
  );
  const hamburger = screen.getByLabelText('Open menu');
  hamburger.focus();
  fireEvent.click(hamburger);
  return hamburger;
}

describe('DashboardLayout — mobile nav drawer focus management (#356)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'visible';
    stubAuth();
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = 'visible';
  });

  it('does not render the drawer until it is opened', () => {
    render(
      <DashboardLayout>
        <div data-testid="child-content">Content</div>
      </DashboardLayout>,
    );
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
  });

  it('exposes the drawer as a modal dialog', () => {
    openDrawer();
    expect(drawer()).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus into the drawer when it opens', () => {
    openDrawer();
    expect(drawer().contains(document.activeElement)).toBe(true);
  });

  it('traps Tab so focus cannot escape the drawer into the page behind it', () => {
    openDrawer();
    const focusables = drawerFocusables();
    const last = focusables[focusables.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);

    // Tab from the last element wraps back inside the drawer.
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    expect(drawer().contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(focusables[0]);
  });

  it('traps Shift+Tab so focus cannot escape backwards out of the drawer', () => {
    openDrawer();
    const focusables = drawerFocusables();
    focusables[0].focus();

    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true });
    expect(drawer().contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });

  it('closes the drawer on Escape', () => {
    openDrawer();
    expect(drawer()).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
  });

  it('restores focus to the hamburger button after the drawer closes', () => {
    const hamburger = openDrawer();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(document.activeElement).toBe(hamburger);
  });

  it('closes the drawer on backdrop click', () => {
    openDrawer();
    // The backdrop is the drawer wrapper's first child.
    const backdrop = drawer().parentElement!.querySelector<HTMLElement>('.bg-black\\/40');
    fireEvent.click(backdrop!);
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
  });

  it('closes the drawer via its close button', () => {
    openDrawer();
    // sidebarContent is shared with the (always-rendered, CSS-hidden) desktop
    // sidebar, so scope the query to the drawer instance.
    const closeButton = drawer().querySelector<HTMLElement>('[aria-label="Close menu"]')!;
    fireEvent.click(closeButton);
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
  });

  it('locks body scroll while the drawer is open and restores it on close', () => {
    openDrawer();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(document.body.style.overflow).toBe('visible');
  });

  it('ignores Escape when the drawer is already closed', () => {
    render(
      <DashboardLayout>
        <div data-testid="child-content">Content</div>
      </DashboardLayout>,
    );
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
