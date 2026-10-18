'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, CreditCard, Banknote, Clock } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, STATUS_ICONS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { aggregatePaymentStats } from '@/lib/dashboard-stats';
import { useAuthStore } from '@/lib/store';
import { Skeleton, SkeletonList } from '@/components/Skeleton';

export default function DashboardPage() {
  const { merchant } = useAuthStore();

  const paymentsQuery = useQuery({
    queryKey: ['payments', 'recent', 1, 5],
    queryFn: () => paymentsApi.list(1, 5).then((res) => res.data.payments),
  });

  const statsQuery = useQuery({
    queryKey: ['payments', 'stats'],
    queryFn: () => paymentsApi.stats().then((res) => res.data),
  });

  const payments = paymentsQuery.data ?? [];
  const stats = statsQuery.data ?? [];
  const loading = paymentsQuery.isLoading || statsQuery.isLoading;
  const error = paymentsQuery.isError || statsQuery.isError
    ? "Couldn't load your dashboard right now."
    : '';

  const { totalVolume, settledCount, pendingCount, totalPayments } = aggregatePaymentStats(stats);

  const statCards = useMemo(
    () => [
      { label: 'Total Volume', value: formatUsd(totalVolume), icon: TrendingUp, color: 'text-blue-600' },
      { label: 'Settled Payments', value: settledCount, icon: Banknote, color: 'text-green-600' },
      { label: 'Pending Payments', value: pendingCount, icon: Clock, color: 'text-yellow-600' },
      { label: 'Total Payments', value: totalPayments, icon: CreditCard, color: 'text-purple-600' },
    ],
    [totalVolume, settledCount, pendingCount, totalPayments],
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{merchant?.businessName ? `, ${merchant.businessName}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Recent payments */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Payments</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {error ? (
            <div
              data-testid="dashboard-error"
              role="alert"
              className="px-6 py-8 text-center text-red-500 text-sm"
            >
              {error}
            </div>
          ) : loading ? (
            <SkeletonList rows={5} />
          ) : payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No payments yet</div>
          ) : (
            payments.map((p) => {
              const StatusIcon = STATUS_ICONS[p.status];
              return (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.reference}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? DEFAULT_STATUS_COLOR}`}>
                      {StatusIcon && <StatusIcon aria-hidden="true" className="w-3 h-3 shrink-0" />}
                      {p.status}
                    </span>
                    <span className="text-sm font-semibold">{formatUsd(p.amountUsd)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
