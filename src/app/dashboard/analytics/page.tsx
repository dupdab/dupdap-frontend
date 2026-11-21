'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Skeleton, SkeletonTableRows } from '@/components/Skeleton';
import { paymentsApi } from '@/lib/api';
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

type Period = '7d' | '30d' | '90d';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

interface TopMerchant {
  merchantId: string;
  merchantName: string;
  totalVolume: number;
  paymentCount: number;
  avgOrderValue: number;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('30d');
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState('');

  // This page is a client component, so it can't export Next.js `metadata`.
  // Set the document title imperatively so the browser tab and history entry
  // reflect the current route instead of the default 'DupDub' title.
  useEffect(() => {
    document.title = 'Analytics — DupDub Dashboard';
  }, []);

  const loadStats = useCallback(() => {
    setLoading(true);
    setError('');
    paymentsApi
      .stats()
      .then(({ data }) => {
        setError('');
        setStats(data);
      })
      .catch(() => setError("Couldn't load analytics."))
      .finally(() => setLoading(false));
  }, []);

  const loadTopMerchants = useCallback((range: Period) => {
    setTopLoading(true);
    setTopError('');
    paymentsApi
      .topMerchants(range)
      .then(({ data }) => {
        setTopError('');
        setTopMerchants(data);
      })
      .catch(() => setTopError("Couldn't load top merchants."))
      .finally(() => setTopLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTopMerchants(period);
  }, [loadTopMerchants, period]);

  const pieData = stats.map((s) => ({
    name: s.status,
    value: parseInt(String(s.count), 10),
    amount: parseFloat(String(s.totalUsd ?? 0)),
  }));

  const totalVolume = stats.reduce(
    (acc, s) => acc + parseFloat(String(s.totalUsd ?? 0)),
    0
  );
  const totalCount = stats.reduce(
    (acc, s) => acc + parseInt(String(s.count), 10),
    0
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
    link.download = `top-merchants-${period}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rankedMerchants, period]);

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
            onClick={loadStats}
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
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold">{totalCount}</p>
            </div>
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
              <VolumeBarChart data={pieData} />
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
