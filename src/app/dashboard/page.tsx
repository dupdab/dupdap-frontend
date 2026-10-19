'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, CreditCard, Banknote, Clock, PlayCircle, X } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, STATUS_ICONS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { aggregatePaymentStats } from '@/lib/dashboard-stats';
import { useAuthStore } from '@/lib/store';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import type { Payment, PaymentStats } from '@/lib/types';

const TUTORIAL_VIDEO_URL = 'https://www.youtube.com/playlist?list=PLmerchant-onboarding';
const TUTORIAL_EMBED_URL = 'https://www.youtube.com/embed/videoseries?list=PLmerchant-onboarding';
const TUTORIAL_TRANSCRIPT = [
  'Welcome to your merchant dashboard. This short walkthrough shows how to go from registration to your first payment.',
  'Step 1: Complete your business profile so customers can recognize you at checkout.',
  'Step 2: Connect your payout account to receive settlements.',
  'Step 3: Create a payment link or share your checkout page with a customer.',
  'Step 4: Track the payment status here on the dashboard until it settles.',
  'That is it. You are ready to accept your first payment.',
];

export default function DashboardPage() {
  const { merchant } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    Promise.all([paymentsApi.list(1, 5), paymentsApi.stats()])
      .then(([p, s]) => {
        setError('');
        setPayments(p.data.payments);
        setStats(s.data);
      })
      .catch(() => setError("Couldn't load your dashboard right now."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!tutorialOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTutorialOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tutorialOpen]);

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

      {/* Onboarding checklist */}
      <div className="card p-5 mb-8">
        <h2 className="font-semibold text-gray-900 mb-2">Getting started</h2>
        <ul className="text-sm text-gray-600 space-y-1 mb-4">
          <li>1. Complete your business profile</li>
          <li>2. Connect your payout account</li>
          <li>3. Create your first payment link</li>
          <li>4. Track your first payment</li>
        </ul>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <PlayCircle aria-hidden="true" className="w-4 h-4" />
            Watch the onboarding video
          </button>
          <a
            href={TUTORIAL_VIDEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Open full playlist
          </a>
        </div>
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

      {/* Tutorial modal */}
      {tutorialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          onClick={() => setTutorialOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 id="tutorial-title" className="font-semibold text-gray-900">
                Merchant onboarding tutorial
              </h2>
              <button
                type="button"
                onClick={() => setTutorialOpen(false)}
                aria-label="Close tutorial"
                className="text-gray-400 hover:text-gray-600"
              >
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="aspect-video w-full mb-4">
                <iframe
                  src={TUTORIAL_EMBED_URL}
                  title="Merchant onboarding video tutorial"
                  className="w-full h-full rounded"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <a
                href={TUTORIAL_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Open on YouTube
              </a>
              <details className="mt-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Video transcript
                </summary>
                <div className="mt-2 text-sm text-gray-600 space-y-2">
                  {TUTORIAL_TRANSCRIPT.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
