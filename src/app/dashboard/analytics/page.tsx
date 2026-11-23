'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Skeleton, SkeletonTableRows } from '@/components/Skeleton';
import { analyticsApi, paymentsApi } from '@/lib/api';
import { percentChange } from '@/lib/dashboard-stats';
import type { PaymentStats } from '@/lib/types';
import { formatUsd } from '@/lib/utils';

import RevenueByMethodCard from './RevenueByMethodCard';

// Recharts is a large library only used on this page. Wrapping the chart
// components with next/dynamic (ssr: false) does two things:
//   1. Excludes recharts from the SSR pass (it references browser-only APIs).
//   2. Ensures the recharts bundle is code-split into a lazy chunk that is
//      only fetched when a merchant actually visits /dashboard/analytics —
//      merchants who never open analytics never download it.
const StatusPieChart = dynamic(() => import('./StatusPieChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
      Loading chart…
    </div>
  ),
});

const VolumeBarChart = dynamic(() => import('./VolumeBarChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
      Loading chart…
    </div>
  ),
});

type Period = 'today' | '7d' | '30d' | '90d' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];

const PRESET_PERIODS = PERIODS.filter((p) => p.value !== 'custom');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a `YYYY-MM-DD` URL param, returning '' when absent or malformed. */
function parseDateParam(value: string | null): string {
  return value && DATE_RE.test(value) ? value : '';
}

/** `YYYY-MM-DD` for a Date, in local time. */
function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Start of the local day for a `YYYY-MM-DD` string. */
function startOfDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** End of the local day for a `YYYY-MM-DD` string. */
function endOfDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

interface TopMerchant {
  merchantId: string;
  merchantName: string;
  totalVolume: number;
  paymentCount: number;
  avgOrderValue: number;
}

const PERIOD_DAYS: Record<Exclude<Period, 'custom'>, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/** Date ranges for the selected period and the period before it (#793). */
function periodRanges(period: Exclude<Period, 'custom'>) {
  const days = PERIOD_DAYS[period];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    current: { from: iso(now - days * dayMs), to: iso(now) },
    previous: { from: iso(now - 2 * days * dayMs), to: iso(now - days * dayMs) },
  };
}

/** Date ranges for an explicit custom range and the equal-length period before it. */
function customRanges(from: string, to: string) {
  const start = startOfDay(from);
  const end = endOfDay(to);
  const spanMs = Math.max(end.getTime() - start.getTime(), 0);
  return {
    current: { from: start.toISOString(), to: end.toISOString() },
    previous: {
      from: new Date(start.getTime() - spanMs).toISOString(),
      to: start.toISOString(),
    },
  };
}

function sumVolume(stats: PaymentStats[]): number {
  return stats.reduce((acc, s) => acc + parseFloat(String(s.totalUsd ?? 0)), 0);
}

function sumCount(stats: PaymentStats[]): number {
  return stats.reduce((acc, s) => acc + parseInt(String(s.count), 10), 0);
}

/** "+12.5% vs previous period" badge, green for up and red for down (#793). */
function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <p className="mt-1 text-xs text-gray-400" data-testid="stat-change">
        No previous period data
      </p>
    );
  }
  const positive = change >= 0;
  return (
    <p
      data-testid="stat-change"
      className={`mt-1 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}
    >
      {positive ? '+' : '−'}
      {Math.abs(change).toFixed(1)}% vs previous period
    </p>
  );
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [prevStats, setPrevStats] = useState<PaymentStats[]>([]);
  const [compare, setCompare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState('');

  // Range state lives in the URL so a view is shareable (#784).
  const rangeParam = searchParams.get('range');
  const fromParam = parseDateParam(searchParams.get('from'));
  const toParam = parseDateParam(searchParams.get('to'));
  const period: Period =
    rangeParam === 'custom' && fromParam && toParam
      ? 'custom'
      : rangeParam === 'today' || rangeParam === '7d' || rangeParam === '90d'
        ? rangeParam
        : '30d';

  const [customFrom, setCustomFrom] = useState(fromParam);
  const [customTo, setCustomTo] = useState(toParam);

  // Keep the custom inputs in sync when the URL changes (back/forward, share).
  useEffect(() => {
    setCustomFrom(fromParam);
    setCustomTo(toParam);
  }, [fromParam, toParam]);

  /** Writes the selected range to the URL. */
  const updateRange = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const selectPeriod = useCallback(
    (next: Period) => {
      if (next === 'custom') {
        const today = toDateInput(new Date());
        const fallbackFrom = toDateInput(new Date(Date.now() - 29 * 86400000));
        updateRange({
          range: 'custom',
          from: fromParam || fallbackFrom,
          to: toParam || today,
        });
        return;
      }
      updateRange({ range: next, from: null, to: null });
    },
    [fromParam, toParam, updateRange]
  );

  const applyCustomRange = useCallback(() => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    updateRange({ range: 'custom', from: customFrom, to: customTo });
  }, [customFrom, customTo, updateRange]);

  // This page is a client component, so it can't export Next.js `metadata`.
  // Set the document title imperatively so the browser tab and history entry
  // reflect the current route instead of the default 'DupDub' title.
  useEffect(() => {
    document.title = 'Analytics — DupDub Dashboard';
  }, []);

  // Loads stats for the selected period and the previous one (#793).
  const loadStats = useCallback(
    (range: Period, from: string, to: string) => {
      setLoading(true);
      setError('');
      const { current, previous } =
        range === 'custom' ? customRanges(from, to) : periodRanges(range);
      Promise.all([
        paymentsApi.stats({ params: current }),
        paymentsApi
          .stats({ params: previous })
          .then(({ data }) => data)
          // Comparison is best-effort: the page still renders without it.
          .catch(() => [] as PaymentStats[]),
      ])
        .then(([{ data }, previousData]) => {
          setError('');
          setStats(data);
          setPrevStats(previousData);
        })
        .catch(() => setError("Couldn't load analytics."))
        .finally(() => setLoading(false));
    },
    []
  );

  const loadTopMerchants = useCallback(
    (range: Period, from: string, to: string) => {
      setTopLoading(true);
      setTopError('');
      analyticsApi
        .getRevenue(range === 'custom' ? `custom:${from}:${to}` : range)
        .then(({ data }) => {
          setTopError('');
          setTopMerchants(data);
        })
        .catch(() => setTopError("Couldn't load top merchants."))
        .finally(() => setTopLoading(false));
    },
    []
  );

  useEffect(() => {
    loadStats(period, fromParam, toParam);
  }, [loadStats, period, fromParam, toParam]);

  useEffect(() => {
    loadTopMerchants(period, fromParam, toParam);
  }, [loadTopMerchants, period, fromParam, toParam]);

  const pieData = useMemo(
    () =>
      stats.map((s) => {
        const prev = prevStats.find((p) => p.status === s.status);
        return {
          name: s.status,
          value: parseInt(String(s.count), 10),
          amount: parseFloat(String(s.totalUsd ?? 0)),
          prevAmount: prev ? parseFloat(String(prev.totalUsd ?? 0)) : 0,
        };
      }),
    [stats, prevStats]
  );

  const totalVolume = useMemo(() => sumVolume(stats), [stats]);
  const totalCount = useMemo(() => sumCount(stats), [stats]);
  const volumeChange = useMemo(
    () => percentChange(totalVolume, sumVolume(prevStats)),
    [totalVolume, prevStats]
  );
  const countChange = useMemo(
    () => percentChange(totalCount, sumCount(prevStats)),
    [totalCount, prevStats]
  );

  const rankedMerchants = useMemo(
    () => [...topMerchants].sort((a, b) => b.totalVolume - a.totalVolume),
    [topMerchants]
  );

  const exportCsv = useCallback(() => {
    const header = [
      'Rank',
      'Merchant',
      'Total Volume (USD)',
      'Payment Count',
      'Avg Order Value (USD)',
    ];
    const rows = rankedMerchants.map((m, i) => [
      i + 1,
      m.merchantName,
      m.totalVolume.toFixed(2),
      m.paymentCount,
      m.avgOrderValue.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `top-merchants-${period === 'custom' ? `${fromParam}_${toParam}` : period}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rankedMerchants, period, fromParam, toParam]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Payment volume and status breakdown
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex flex-wrap rounded-md border border-gray-200 dark:border-gray-700"
          role="group"
          aria-label="Date range"
        >
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => selectPeriod(p.value)}
              aria-pressed={period === p.value}
              className={`px-3 py-1.5 text-sm font-medium ${
                period === p.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyCustomRange();
            }}
          >
            <label className="flex flex-col text-xs text-gray-500">
              From
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-500">
              To
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
            <button
              type="submit"
              disabled={!customFrom || !customTo || customFrom > customTo}
              className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Apply
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <div className="space-y-6" aria-busy="true">
          {/* stat card skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="card p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-9 w-32" />
              </div>
            ))}
          </div>
          {/* chart card skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="card p-6">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-[250px] w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadStats(period, fromParam, toParam)}
            className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-6">
              <p className="text-sm text-gray-500 mb-1">Total Volume</p>
              <p className="text-3xl font-bold">{formatUsd(totalVolume)}</p>
              <ChangeBadge change={volumeChange} />
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold">{totalCount}</p>
              <ChangeBadge change={countChange} />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCompare((c) => !c)}
              aria-pressed={compare}
              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium ${
                compare
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              Compare to previous period
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Payment Count by Status</h2>
              <StatusPieChart data={pieData} />
              {/* Visually-hidden data table — same data as chart for screen readers */}
              <table className="sr-only">
                <caption>Payment Count by Status</caption>
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold mb-4">Volume by Status (USD)</h2>
              <VolumeBarChart data={pieData} compare={compare} />
              {/* Visually-hidden data table — same data as chart for screen readers */}
              <table className="sr-only">
                <caption>Volume by Status (USD)</caption>
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Volume (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{formatUsd(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <RevenueByMethodCard />

          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="font-semibold">Top Merchants</h2>
              <div className="flex items-center gap-2">
                <div
                  className="inline-flex rounded-md border border-gray-200 dark:border-gray-700"
                  role="group"
                  aria-label="Time period"
                >
                  {PRESET_PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => selectPeriod(p.value)}
                      aria-pressed={period === p.value}
                      className={`px-3 py-1.5 text-sm font-medium ${
                        period === p.value
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={rankedMerchants.length === 0}
                  className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {topLoading ? (
              <table className="w-full text-sm" aria-busy="true">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th scope="col" className="py-2">Rank</th>
                    <th scope="col" className="py-2">Merchant</th>
                    <th scope="col" className="py-2">Total Volume</th>
                    <th scope="col" className="py-2">Payments</th>
                    <th scope="col" className="py-2">Avg Order Value</th>
                  </tr>
                </thead>
                <SkeletonTableRows rows={5} cols={5} />
              </table>
            ) : topError ? (
              <div className="text-center py-8 text-red-500">
                <p>{topError}</p>
                <button
                  type="button"
                  onClick={() => loadTopMerchants(period, fromParam, toParam)}
                  className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Retry
                </button>
              </div>
            ) : rankedMerchants.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No merchant activity in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th scope="col" className="py-2">Rank</th>
                      <th scope="col" className="py-2">Merchant</th>
                      <th scope="col" className="py-2">Total Volume</th>
                      <th scope="col" className="py-2">Payments</th>
                      <th scope="col" className="py-2">Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedMerchants.map((m, i) => (
                      <tr
                        key={m.merchantId}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-2">{i + 1}</td>
                        <td className="py-2">{m.merchantName}</td>
                        <td className="py-2">{formatUsd(m.totalVolume)}</td>
                        <td className="py-2">{m.paymentCount}</td>
                        <td className="py-2">{formatUsd(m.avgOrderValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
