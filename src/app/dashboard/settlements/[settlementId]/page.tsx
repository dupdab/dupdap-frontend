'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Skeleton } from '@/components/Skeleton';
import { settlementsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { Settlement, SettlementPayment } from '@/lib/types';
import {
  formatNgn,
  formatUsd,
  formatDate,
  STATUS_COLORS,
  STATUS_ICONS,
  DEFAULT_STATUS_COLOR,
  PENDING_APPROVAL_MESSAGE,
  PENDING_APPROVAL_ETA,
  isPendingApprovalStatus,
} from '@/lib/utils';

/** Fiat currency label for the settlement payout. */
function getFiatCurrency(settlement: Settlement): string {
  return settlement.fiatCurrency ?? 'NGN';
}

/** Formats the payout amount in the settlement's fiat currency. */
function formatFiat(amount: number, currency: string): string {
  if (currency === 'NGN') return formatNgn(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function SettlementDetailPage({
  params: paramsProp,
}: {
  params?: { settlementId: string };
}) {
  const params = useParams<{ settlementId: string }>();
  const settlementId = paramsProp?.settlementId ?? params?.settlementId;

  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const loadSettlement = useCallback(async () => {
    if (!settlementId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await settlementsApi.get(settlementId);
      setSettlement(data);
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Failed to load settlement');
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => {
    loadSettlement();
  }, [loadSettlement]);

  const downloadReceipt = async () => {
    if (!settlementId) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { data } = await settlementsApi.receipt(settlementId);
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settlement-${settlementId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        getErrorMessage(err) ?? 'Failed to download receipt'
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <span role="status" aria-live="polite" className="sr-only">
          Loading settlement…
        </span>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !settlement) {
    return (
      <div className="p-4 md:p-8 space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={loadSettlement}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!settlement) {
    return <div className="p-4 md:p-8 text-gray-500">Settlement not found.</div>;
  }

  const StatusIcon = STATUS_ICONS[settlement.status];
  const currency = getFiatCurrency(settlement);
  const payments: SettlementPayment[] = settlement.payments ?? [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/settlements"
            className="text-sm text-brand-600 hover:underline"
          >
            ← Back to settlements
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Settlement {settlement.id.slice(0, 8)}
          </h1>
          <p className="mt-1 font-mono text-xs text-gray-500">{settlement.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[settlement.status] ?? DEFAULT_STATUS_COLOR}`}
          >
            {StatusIcon && (
              <StatusIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
            )}
            {settlement.status}
          </span>
          <button
            type="button"
            onClick={downloadReceipt}
            disabled={downloading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {downloading ? 'Preparing…' : 'Download PDF receipt'}
          </button>
        </div>
      </div>

      {isPendingApprovalStatus(settlement.status) && (
        <div
          role="status"
          className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800"
        >
          <p className="font-medium">{PENDING_APPROVAL_MESSAGE}</p>
          <p className="mt-1">{PENDING_APPROVAL_ETA}</p>
        </div>
      )}

      {downloadError && (
        <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-600">
          {downloadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">Gross amount</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {formatFiat(settlement.totalAmountUsd, currency)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Fee</div>
          <div className="mt-1 font-semibold text-red-600">
            -{formatFiat(settlement.feeAmountUsd, currency)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Net amount</div>
          <div className="mt-1 font-semibold text-green-700">
            {formatFiat(settlement.netAmountUsd, currency)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Fiat currency</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {currency}
          </div>
        </div>
      </div>

      <div className="card p-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {formatDate(settlement.createdAt)}
            </dd>
          </div>
          {settlement.completedAt ? (
            <div>
              <dt className="text-gray-500">Completed</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatDate(settlement.completedAt)}
              </dd>
            </div>
          ) : null}
          {settlement.bankReference ? (
            <div>
              <dt className="text-gray-500">Bank reference</dt>
              <dd className="break-all font-mono text-xs text-gray-900 dark:text-gray-100">
                {settlement.bankReference}
              </dd>
            </div>
          ) : null}
          {settlement.failureReason ? (
            <div>
              <dt className="text-gray-500">Failure reason</dt>
              <dd className="text-red-600">{settlement.failureReason}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <section aria-labelledby="linked-payments-heading" className="card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2
            id="linked-payments-heading"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Linked payments
            {typeof settlement.paymentCount === 'number'
              ? ` (${settlement.paymentCount})`
              : ''}
          </h2>
        </div>
        {payments.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-500">
            No linked payments found for this settlement.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-6 py-3 text-sm"
              >
                <div>
                  <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {p.reference ?? p.id.slice(0, 8)}
                  </p>
                  {p.createdAt ? (
                    <p className="text-xs text-gray-400">
                      {formatDate(p.createdAt)}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  {typeof p.amountUsd === 'number' ? (
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatUsd(p.amountUsd)}
                    </p>
                  ) : null}
                  {p.status ? (
                    <p className="text-xs capitalize text-gray-500">{p.status}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
              className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setShowReject((v) => !v)}
              disabled={submitting}
              className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>

          {showReject && (
            <div className="space-y-2 rounded border p-4">
              <label
                htmlFor="reject-reason"
                className="block text-sm font-medium"
              >
                Rejection reason
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded border p-2"
                placeholder="Explain why this settlement is being rejected"
              />
              <button
                type="button"
                onClick={reject}
                disabled={submitting || !rejectReason.trim()}
                className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Confirm rejection
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Audit trail</h2>
        {settlement.auditTrail.length === 0 ? (
          <div className="text-sm text-gray-500">No audit entries yet.</div>
        ) : (
          <ul className="divide-y rounded border">
            {settlement.auditTrail.map((entry) => (
              <li key={entry.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{entry.action}</span>
                  <span className="text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-gray-600">by {entry.actor}</div>
                {entry.reason && (
                  <div className="mt-1 text-gray-700">
                    Reason: {entry.reason}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
