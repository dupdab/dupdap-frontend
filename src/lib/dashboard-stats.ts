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
}

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

  return {
    statMap,
    totalVolume,
    settledCount: statMap.settled?.count ?? 0,
    pendingCount: statMap.pending?.count ?? 0,
    totalPayments,
  };
}
