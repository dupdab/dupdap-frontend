'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatNgn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  reason?: string | null;
  createdAt: string;
}

interface Settlement {
  id: string;
  merchant: string;
  amount: number;
  fee: number;
  net: number;
  stellarReference: string;
  status: string;
  createdAt: string;
  auditTrail: AuditEntry[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function AdminSettlementDetailPage() {
  const params = useParams<{ settlementId: string }>();
  const settlementId = params?.settlementId;

  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadSettlement = useCallback(async () => {
    if (!settlementId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/settlements/${settlementId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load settlement');
      setSettlement(await res.json());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load settlement'
      );
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => {
    loadSettlement();
  }, [loadSettlement]);

  const approve = async () => {
    if (!settlementId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/admin/settlements/${settlementId}/approve`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to approve settlement');
      await loadSettlement();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to approve settlement'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!settlementId) return;
    if (!rejectReason.trim()) {
      setError('A rejection reason is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/admin/settlements/${settlementId}/reject`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        }
      );
      if (!res.ok) throw new Error('Failed to reject settlement');
      setShowReject(false);
      setRejectReason('');
      await loadSettlement();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reject settlement'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading settlement…</div>;
  }

  if (error && !settlement) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!settlement) {
    return <div className="p-6 text-gray-500">Settlement not found.</div>;
  }

  const isPending = settlement.status === 'pending';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settlement {settlement.id}</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm capitalize">
          {settlement.status}
        </span>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Merchant</div>
          <div className="font-medium">{settlement.merchant}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Stellar reference</div>
          <div className="break-all font-mono text-sm">
            {settlement.stellarReference}
          </div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Amount (NGN)</div>
          <div className="font-medium">{formatNgn(settlement.amount)}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Fee (NGN)</div>
          <div className="font-medium">{formatNgn(settlement.fee)}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Net (NGN)</div>
          <div className="font-medium">{formatNgn(settlement.net)}</div>
        </div>
      </div>

      {isPending && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={approve}
              disabled={submitting}
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
