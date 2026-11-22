import type { PaymentStats } from './types';

export interface StatEntry {
  count: number;
  total: number;
}

export interface DashboardStatsSummary {
  statMap: Record<string, StatEntry>;
  totalVolume: number;
  settledCount: number;
  pendingCount: number;
  totalPayments: number;
  /** Share of payments that reached a successful status, 0–100 (#794). */
  conversionRate: number;
}

/** Statuses that count as a converted (successfully paid) payment. */
const CONVERTED_STATUSES = [
  'confirmed',
  'settling',
  'settled',
  'completed',
  'partially_refunded',
  'refunded',
];

function safeInt(value: unknown): number {
  const parsed = parseInt(String(value ?? 0), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeFloat(value: unknown): number {
  const parsed = parseFloat(String(value ?? 0));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function aggregatePaymentStats(stats: PaymentStats[]): DashboardStatsSummary {
  const statMap = stats.reduce<Record<string, StatEntry>>((acc, s) => {
    acc[s.status] = { count: safeInt(s.count), total: safeFloat(s.totalUsd) };
    return acc;
  }, {});

  const totalVolume = stats.reduce((acc, s) => acc + safeFloat(s.totalUsd), 0);
  const totalPayments = stats.reduce((acc, s) => acc + safeInt(s.count), 0);
  const convertedCount = CONVERTED_STATUSES.reduce(
    (acc, status) => acc + (statMap[status]?.count ?? 0),
    0
  );
  const conversionRate =
    totalPayments > 0 ? (convertedCount / totalPayments) * 100 : 0;

  return {
    statMap,
    totalVolume,
    settledCount: statMap.settled?.count ?? 0,
    pendingCount: statMap.pending?.count ?? 0,
    totalPayments,
    conversionRate,
  };
}

/**
 * Percentage change from `previous` to `current` (#793). Returns null when
 * there is no previous value to compare against.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
