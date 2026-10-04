/**
 * Unit tests for the dashboard nav active-state matcher.
 *
 * Issue #358: the sidebar used a bare `pathname.startsWith(href)`, which also
 * highlighted a nav item for sibling routes that merely share a string prefix
 * (e.g. /dashboard/settlements-export). Rendering coverage for the layout that
 * consumes this helper lives in src/__tests__/dashboard-nav-active.test.tsx.
 */
import { describe, expect, it } from 'vitest';
import { isNavItemActive } from './nav-active';

describe('isNavItemActive', () => {
  it('matches an exact path', () => {
    expect(isNavItemActive('/dashboard/payments', '/dashboard/payments')).toBe(true);
  });

  it('matches a nested route under the item', () => {
    expect(isNavItemActive('/dashboard/settlements/abc123', '/dashboard/settlements')).toBe(true);
    expect(isNavItemActive('/dashboard/admin/settlements', '/dashboard/admin')).toBe(true);
  });

  it('does not match a sibling route that only shares a string prefix (#358)', () => {
    expect(isNavItemActive('/dashboard/settlements-export', '/dashboard/settlements')).toBe(false);
    expect(isNavItemActive('/dashboard/settings-advanced', '/dashboard/settings')).toBe(false);
    expect(isNavItemActive('/dashboard/payments-archive', '/dashboard/payments')).toBe(false);
  });

  it('does not match a completely unrelated route', () => {
    expect(isNavItemActive('/dashboard/webhooks', '/dashboard/payments')).toBe(false);
    expect(isNavItemActive('/dashboard', '/dashboard/payments')).toBe(false);
  });

  it('ignores a trailing slash on either side (#358)', () => {
    expect(isNavItemActive('/dashboard/payments/', '/dashboard/payments')).toBe(true);
    expect(isNavItemActive('/dashboard/payments', '/dashboard/payments/')).toBe(true);
    expect(isNavItemActive('/dashboard/payments/', '/dashboard/payments/')).toBe(true);
  });

  it('ignores query strings and hash fragments (#358)', () => {
    expect(isNavItemActive('/dashboard/payments?tab=open', '/dashboard/payments')).toBe(true);
    expect(isNavItemActive('/dashboard/payments/?tab=open', '/dashboard/payments')).toBe(true);
    expect(isNavItemActive('/dashboard/payments#list', '/dashboard/payments')).toBe(true);
    expect(isNavItemActive('/dashboard/settlements/abc?x=1#top', '/dashboard/settlements')).toBe(true);
  });

  it('only matches exactly when exact is true', () => {
    expect(isNavItemActive('/dashboard', '/dashboard', true)).toBe(true);
    expect(isNavItemActive('/dashboard/', '/dashboard', true)).toBe(true);
    expect(isNavItemActive('/dashboard?x=1', '/dashboard', true)).toBe(true);
    expect(isNavItemActive('/dashboard/payments', '/dashboard', true)).toBe(false);
    expect(isNavItemActive('/dashboardish', '/dashboard', true)).toBe(false);
  });

  it('handles the root path without collapsing it', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/', '/dashboard', true)).toBe(false);
  });

  it('returns false for nullish paths', () => {
    expect(isNavItemActive(null, '/dashboard')).toBe(false);
    expect(isNavItemActive(undefined, '/dashboard')).toBe(false);
    expect(isNavItemActive('/dashboard', '')).toBe(false);
  });
});
