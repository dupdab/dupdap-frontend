'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, CreditCard, Banknote, Clock } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, STATUS_ICONS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { aggregatePaymentStats } from '@/lib/dashboard-stats';
import { useAuthStore } from '@/lib/store';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import { useLocale } from '@/lib/locale';
import type { Payment, PaymentStats } from '@/lib/types';

export default function DashboardPage() {
  const { merchant } = useAuthStore();
  const { t, locale } = useLocale();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([paymentsApi.list(1, 5), paymentsApi.stats()])
      .then(([p, s]) => {
        setError('');
        setPayments(p.data.payments);
        setStats(s.data);
      })
      .catch(() => setError(t('dashboard.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const { totalVolume, settledCount, pendingCount, totalPayments } = aggregatePaymentStats(stats);

  const statCards = useMemo(
    () => [
      { label: t('dashboard.totalVolume'), value: formatUsd(totalVolume, locale), icon: TrendingUp, color: 'text-blue-600' },
      { label: t('dashboard.settledPayments'), value: settledCount, icon: Banknote, color: 'text-green-600' },
      { label: t('dashboard.pendingPayments'), value: pendingCount, icon: Clock, color: 'text-yellow-600' },
      { label: t('dashboard.totalPayments'), value: totalPayments, icon: CreditCard, color: 'text-purple-600' },
    ],
    [totalVolume, settledCount, pendingCount, totalPayments, t, locale],
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.welcome')}{merchant?.businessName ? `, ${merchant.businessName}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
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
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Recent payments */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.recentPayments')}</h2>
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
            <div className="px-6 py-8 text-center text-gray-400 text-sm">{t('dashboard.noPayments')}</div>
          ) : (
            payments.map((p) => {
              const StatusIcon = STATUS_ICONS[p.status];
              return (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.reference}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.createdAt, locale)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? DEFAULT_STATUS_COLOR}`}>
                      {StatusIcon && <StatusIcon aria-hidden="true" className="w-3 h-3 shrink-0" />}
                      {p.status}
                    </span>
                    <span className="text-sm font-semibold">{formatUsd(p.amountUsd, locale)}</span>
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
