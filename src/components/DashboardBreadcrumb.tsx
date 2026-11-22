'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface Breadcrumb {
  label: string;
  href: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  payments: 'Payments',
  settlements: 'Settlements',
  analytics: 'Analytics',
  webhooks: 'Webhooks',
  settings: 'Settings',
  admin: 'Admin',
  aml: 'AML',
};

/** Human-readable label for a route segment (dynamic IDs stay as-is). */
function labelForSegment(segment: string): string {
  const known = SEGMENT_LABELS[segment.toLowerCase()];
  // Dynamic IDs (e.g. PAY-123) must be shown exactly as they appear in the URL.
  return known ?? decodeURIComponent(segment);
}

/** Build the breadcrumb trail from a dashboard pathname. */
export function buildBreadcrumbs(pathname: string | null): Breadcrumb[] {
  const segments = (pathname ?? '/dashboard').split('/').filter(Boolean);
  if (segments[0] !== 'dashboard') return [];

  return segments.map((segment, index) => ({
    label: labelForSegment(segment),
    href: `/${segments.slice(0, index + 1).join('/')}`,
  }));
}

/**
 * Accessible breadcrumb navigation for nested dashboard pages, e.g.
 * Dashboard > Payments > PAY-123. The final crumb is the current page.
 */
export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-gray-500 dark:text-gray-400">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="text-gray-400">
                  {' > '}
                </span>
              )}
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="font-medium text-gray-900 dark:text-gray-100"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-brand-600 hover:underline dark:hover:text-brand-300"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default DashboardBreadcrumb;
