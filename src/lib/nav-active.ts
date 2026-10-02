/**
 * Active-state matching for the dashboard sidebar nav.
 *
 * Extracted from `src/app/dashboard/layout.tsx` so the path-matching rules are
 * unit-testable and shared by both the desktop sidebar and the mobile drawer.
 */

/**
 * Strips a query string and/or hash fragment and normalizes trailing slashes so
 * that `/dashboard/payments/?tab=open#top` and `/dashboard/payments` compare
 * equal. Returns '' for nullish input.
 */
function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return '';
  const withoutQuery = pathname.split(/[?#]/)[0];
  // Collapse a trailing slash, but keep the root '/' intact.
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.replace(/\/+$/, '') || '/';
  }
  return withoutQuery;
}

/**
 * Returns true when `pathname` should highlight the nav item pointing at `href`.
 *
 * Matching is segment-aware: a non-exact item is active only on an exact match
 * or when the path continues past `href` on a `/` boundary. A bare
 * `startsWith` would wrongly mark `/dashboard/settlements` active for a sibling
 * route such as `/dashboard/settlements-export` (issue #358).
 *
 * @param exact When true, only an exact path match counts (used for the
 * dashboard "Overview" link, which is also a prefix of every other route).
 */
export function isNavItemActive(
  pathname: string | null | undefined,
  href: string,
  exact = false,
): boolean {
  const path = normalizePathname(pathname);
  const target = normalizePathname(href);
  if (!path || !target) return false;
  if (path === target) return true;
  if (exact) return false;
  return path.startsWith(`${target}/`);
}
