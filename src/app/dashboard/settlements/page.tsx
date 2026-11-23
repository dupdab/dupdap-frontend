'use client';

import Link from 'next/link';
import { memo, useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import { SkeletonList, SkeletonTableRows } from '@/components/Skeleton';
import { settlementsApi } from '@/lib/api';
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

// ---------------------------------------------------------------------------
// Memoized row components — skips re-renders caused by parent state changes
// (pagination, error state) that don't affect already-rendered rows.
// ---------------------------------------------------------------------------

interface SettlementRowProps {
  settlement: Settlement;
  onShowPayments: (settlement: Settlement) => void;
}

function getSettlementPaymentCount(s: Settlement): number | null {
  if (typeof s.paymentCount === 'number') return s.paymentCount;
  if (Array.isArray(s.payments)) return s.payments.length;
  return null;
}

/** Desktop table row */
const SettlementTableRow = memo(function SettlementTableRow({
  settlement: s,
  onShowPayments,
}: SettlementRowProps) {
  const StatusIcon = STATUS_ICONS[s.status];
  const paymentCount = getSettlementPaymentCount(s);
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 font-mono text-xs text-gray-500">
        <Link
          href={`/dashboard/settlements/${s.id}`}
          className="hover:text-brand-700 hover:underline"
        >
          {s.id.slice(0, 8)}...
        </Link>
      </td>
      <td className="px-6 py-4">{formatNgn(s.totalAmountUsd)}</td>
      <td className="px-6 py-4 text-red-600">-{formatNgn(s.feeAmountUsd)}</td>
      <td className="px-6 py-4 font-semibold text-green-700">
        {formatNgn(s.netAmountUsd)}
      </td>
      <td className="px-6 py-4">
        {paymentCount === null ? (
          <span className="text-gray-400 text-xs">—</span>
        ) : (
          <button
            type="button"
            data-testid={`settlement-payments-${s.id}`}
            onClick={() => onShowPayments(s)}
            className="text-brand-600 hover:underline text-sm font-medium"
            aria-label={`View ${paymentCount} payments for settlement ${s.id.slice(0, 8)}`}
          >
            {paymentCount}
          </button>
        )}
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? DEFAULT_STATUS_COLOR}`}
        >
          {StatusIcon && (
            <StatusIcon aria-hidden="true" className="w-3 h-3 shrink-0" />
          )}
          {s.status}
        </span>
        {isPendingApprovalStatus(s.status) && (
          <span
            role="note"
            className="mt-1 block max-w-xs text-xs text-orange-700"
          >
            {PENDING_APPROVAL_MESSAGE} {PENDING_APPROVAL_ETA}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-gray-500">{formatDate(s.createdAt)}</td>
    </tr>
  );
});

/** Mobile card */
const SettlementMobileCard = memo(function SettlementMobileCard({
  settlement: s,
  onShowPayments,
}: SettlementRowProps) {
  const StatusIcon = STATUS_ICONS[s.status];
  const paymentCount = getSettlementPaymentCount(s);
  return (
    <div className="px-6 py-4 space-y-1">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/settlements/${s.id}`}
          className="font-mono text-xs text-gray-500 hover:text-brand-700 hover:underline"
        >
          {s.id.slice(0, 8)}...
        </Link>
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? DEFAULT_STATUS_COLOR}`}
        >
          {StatusIcon && (
            <StatusIcon aria-hidden="true" className="w-3 h-3 shrink-0" />
          )}
          {s.status}
        </span>
      </div>
      {isPendingApprovalStatus(s.status) && (
        <p role="note" className="text-xs text-orange-700">
          {PENDING_APPROVAL_MESSAGE} {PENDING_APPROVAL_ETA}
        </p>
      )}
      <div className="font-semibold text-green-700">
        {formatNgn(s.netAmountUsd)}
      </div>
      <div className="text-xs text-gray-500">
        Gross {formatNgn(s.totalAmountUsd)} · Fee -{formatNgn(s.feeAmountUsd)}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(s.createdAt)}</span>
        {paymentCount !== null ? (
          <button
            type="button"
            data-testid={`settlement-payments-mobile-${s.id}`}
            onClick={() => onShowPayments(s)}
            className="text-brand-600 hover:underline font-medium"
            aria-label={`View ${paymentCount} payments for settlement ${s.id.slice(0, 8)}`}
          >
            {paymentCount} payment{paymentCount === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>
    </div>
  );
});

/** Inline SVG illustration for the settlements empty state (no external requests). */
function SettlementsEmptyIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="w-24 h-24 mx-auto text-brand-200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="52" className="fill-brand-50" />
      <rect
        x="34"
        y="40"
        width="52"
        height="44"
        rx="6"
        className="stroke-current"
        strokeWidth="3"
      />
      <path d="M34 54h52" className="stroke-current" strokeWidth="3" />
      <path
        d="M46 68h20"
        className="stroke-current"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M46 76h12"
        className="stroke-current"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="82"
        cy="82"
        r="14"
        className="fill-white stroke-current"
        strokeWidth="3"
      />
      <path
        d="M82 76v12M76 82h12"
        className="stroke-current"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Shared empty state for both mobile and desktop layouts. */
function SettlementsEmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <SettlementsEmptyIllustration />
      <p className="mt-4 text-sm font-medium text-gray-700">
        No settlements yet
      </p>
      <p className="mt-1 text-sm text-gray-400">
        A settlement is a batch payout that groups your completed payments and
        transfers the net amount, after fees, to your bank account. Settlements
        appear here once your first payments are processed and the payout batch
        is created.
      </p>
    </div>
  );
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [selectedSettlement, setSelectedSettlement] =
    useState<Settlement | null>(null);
  const [linkedPayments, setLinkedPayments] = useState<SettlementPayment[]>([]);

  useEffect(() => {
    settlementsApi
      .list(page, 20)
      .then(({ data }) => {
        setError('');
        setSettlements(data.settlements);
        setTotal(data.total);
      })
      .catch(() => {
        setError("Couldn't load settlements.");
      })
      .finally(() => setLoading(false));
  }, [page]);

  const showPayments = async (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setPaymentsOpen(true);
    setPaymentsError('');
    setLinkedPayments(settlement.payments ?? []);
    setPaymentsLoading(true);
    try {
      const { data } = await settlementsApi.get(settlement.id);
      const detail = data as Settlement;
      setLinkedPayments(detail.payments ?? settlement.payments ?? []);
      setSelectedSettlement(detail);
    } catch {
      setPaymentsError("Couldn't load linked payments.");
      setLinkedPayments(settlement.payments ?? []);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Parenthesized explicitly: `total > 20 || page > 1 && <controls>` parses as
  // `total > 20 || (page > 1 && <controls>)` because && binds tighter than ||,
  // which short-circuits to the boolean `true` and renders no controls (#338).
  const showPagination = total > 20 || page > 1;
  const hasPendingApproval = settlements.some((s) =>
    isPendingApprovalStatus(s.status)
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settlements
        </h1>
        <p className="text-sm text-gray-500 mt-1">{total} total settlements</p>
      </div>

      {hasPendingApproval && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800"
        >
          <p className="font-medium">{PENDING_APPROVAL_MESSAGE}</p>
          <p className="mt-1">{PENDING_APPROVAL_ETA}</p>
        </div>
      )}

      <div className="card">
        {error ? (
          <div className="px-6 py-4 text-sm text-red-500">{error}</div>
        ) : null}
        {loading ? (
          <span role="status" aria-live="polite" className="sr-only">
            Loading settlements…
          </span>
        ) : null}
        {/* Mobile card layout */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <SkeletonList rows={6} />
          ) : settlements.length === 0 ? (
            <SettlementsEmptyState />
          ) : (
            settlements.map((s) => (
              <SettlementMobileCard
                key={s.id}
                settlement={s}
                onShowPayments={showPayments}
              />
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Gross (NGN)
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Fee (NGN)
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Net (NGN)
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Payments
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <SettlementsEmptyState />
                  </td>
                </tr>
              ) : (
                settlements.map((s) => (
                  <SettlementTableRow
                    key={s.id}
                    settlement={s}
                    onShowPayments={showPayments}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {showPagination && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <div className="flex gap-2">
              <button
                data-testid="pagination-prev"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm px-3 py-1"
              >
                Prev
              </button>
              <button
                data-testid="pagination-next"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="btn-secondary text-sm px-3 py-1"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={paymentsOpen}
        onClose={() => {
          setPaymentsOpen(false);
          setSelectedSettlement(null);
          setLinkedPayments([]);
          setPaymentsError('');
        }}
        title={
          selectedSettlement
            ? `Settlement ${selectedSettlement.id.slice(0, 8)} payments`
            : 'Settlement payments'
        }
        testId="settlement-payments-modal"
      >
        {paymentsLoading ? (
          <p className="text-sm text-gray-500">Loading linked payments…</p>
        ) : paymentsError ? (
          <p className="text-sm text-red-600">{paymentsError}</p>
        ) : linkedPayments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No linked payments found for this settlement.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-mono text-xs text-gray-700">
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
                    <p className="font-medium text-gray-900">
                      {formatUsd(p.amountUsd)}
                    </p>
                  ) : null}
                  {p.status ? (
                    <p className="text-xs text-gray-500 capitalize">
                      {p.status}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
