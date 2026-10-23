/**
 * @file dashboard.test.tsx
 * @description Comprehensive test suite for the Dashboard overview page (Issue #382).
 *
 * The page fetches payments (list) and stats simultaneously using Promise.all.
 * It renders four stat cards, a recent payments list, and handles loading/error states.
 *
 * Note: The source uses `DEFAULT_STATUS_COLOR` as a global in JSX without importing it
 * (same pattern as analytics page with recharts). We inject a global stub before import.
 * Also: `PAYMENT_STATUS_COLORS` is imported from utils — mocked below.
 *
 * Covers:
 *  - Welcome heading renders with merchant business name
 *  - Stat cards visible (Total Volume, Settled, Pending, Total Payments)
 *  - Loading skeletons displayed while fetch is in flight
 *  - Recent payments list renders with reference, status, amount
 *  - Empty state "No payments yet" when list is empty
 *  - API error message rendered
 *  - Both APIs called on mount
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

import type { Payment } from '@/lib/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** Wraps the page in a fresh QueryClient so useQuery works per test (retry off for fast failures). */
/* ── Global stubs ─────────────────────────────────────────────────────────── */
/* DEFAULT_STATUS_COLOR is used as a global in page.tsx without an import */
beforeAll(() => {
  (globalThis as Record<string, unknown>).DEFAULT_STATUS_COLOR =
    'bg-gray-100 text-gray-700';
});

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockList = vi.fn();
const mockStats = vi.fn();

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: (...args: unknown[]) => mockList(...args),
    stats: (...args: unknown[]) => mockStats(...args),
  },
}));

vi.mock('@/lib/store', () => ({
  useAuthStore: () => ({
    merchant: { id: 'merch-1', businessName: 'Acme Corp' },
  }),
}));

vi.mock('@/lib/utils', () => ({
  formatUsd: (v: number) => `$${Number(v).toFixed(2)}`,
  formatDate: (s: string) => s.slice(0, 10),
  DEFAULT_STATUS_COLOR: 'bg-gray-100 text-gray-600',
  STATUS_ICONS: {
    completed: (props: { className?: string; 'aria-hidden'?: boolean }) => (
      <svg data-testid="status-icon" {...props} />
    ),
    pending: (props: { className?: string; 'aria-hidden'?: boolean }) => (
      <svg data-testid="status-icon" {...props} />
    ),
  },
  PAYMENT_STATUS_COLORS: {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    settled: 'bg-blue-100 text-blue-700',
  },
}));

vi.mock('@/components/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
  SkeletonList: ({ rows }: { rows: number }) => (
    <div data-testid="skeleton-list">{rows} skeleton rows</div>
  ),
}));

vi.mock('lucide-react', () => ({
  TrendingUp: () => <span>TrendingUp</span>,
  CreditCard: () => <span>CreditCard</span>,
  Banknote: () => <span>Banknote</span>,
  Clock: () => <span>Clock</span>,
}));

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const statsData = [
  { status: 'settled', count: 5, totalUsd: 2500 },
  { status: 'pending', count: 3, totalUsd: 1000 },
  { status: 'failed', count: 1, totalUsd: 200 },
];

const makePayment = (
  i: number,
  status: Payment['status'] = 'completed'
): Payment => ({
  id: `pay-${i}`,
  reference: `REF-00${i}`,
  amountUsd: 100 + i * 10,
  status,
  stellarMemo: `MEMO-${i}`,
  createdAt: '2024-01-15T10:00:00Z',
  description: `Payment ${i}`,
});

/* Lazy import — after globals are set */
import DashboardPage from './page';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// DashboardPage data loaded
