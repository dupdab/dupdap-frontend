'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/lib/store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AuditEntry {
  id: string;
  action: string;
  actor?: string;
  reason?: string | null;
  createdAt: string;
}

interface Settlement {
  id: string;
  merchant?: string;
  merchantName?: string;
  amount: number;
  fee: number;
  net: number;
  stellarReference?: string;
  stellarTxHash?: string;
  status: string;
  createdAt?: string;
  auditTrail?: AuditEntry[];
}

function formatAmount(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

export default function AdminSettlementsPage() {
  const { token, merchant } = useAuthStore();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadSettlements = useCallback(async () => {
    if (!token && !merchant) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/settlements?status=pending`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load settlements');
      const data = await res.json();
      setSettlements(Array.isArray(data) ? data : (data.settlements ?? []));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load settlements'
      );
    } finally {
      setLoading(false);
    }
  }, [token, merchant]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const approve = async (id: string) => {
    if (!token && !merchant) return;
    setSubmittingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/settlements/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to approve settlement');
      await loadSettlements();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to approve settlement'
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const reject = async (id: string) => {
    if (!token && !merchant) return;
    if (!rejectReason.trim()) {
      setError('A rejection reason is required');
      return;
    }
    setSubmittingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/settlements/${id}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error('Failed to reject settlement');
      setRejectingId(null);
      setRejectReason('');
      await loadSettlements();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reject settlement'
      );
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Settlement Approvals
      </h1>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div role="status" aria-busy="true" className="text-sm text-gray-500">
          Loading settlements…
        </div>
      ) : settlements.length === 0 ? (
        <p className="text-sm text-gray-500">
          No settlements pending approval.
        </p>
      ) : (
        <ul className="space-y-4">
          {settlements.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">
                    {s.merchantName || s.merchant || 'Unknown merchant'}
                  </p>
                  <p>Amount: {formatAmount(s.amount)}</p>
                  <p>Fee: {formatAmount(s.fee)}</p>
                  <p>Net: {formatAmount(s.net)}</p>
                  <p className="break-all">
                    Stellar reference:{' '}
                    <span className="font-mono text-xs">
                      {s.stellarReference || s.stellarTxHash || '—'}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approve(s.id)}
                    disabled={submittingId === s.id}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(rejectingId === s.id ? null : s.id);
                      setRejectReason('');
                    }}
                    disabled={submittingId === s.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {rejectingId === s.id && (
                <div className="mt-3 space-y-2">
                  <label
                    htmlFor={`reason-${s.id}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Rejection reason
                  </label>
                  <textarea
                    id={`reason-${s.id}`}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                    placeholder="Explain why this settlement is rejected"
                  />
                  <button
                    type="button"
                    onClick={() => reject(s.id)}
                    disabled={submittingId === s.id}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm rejection
                  </button>
                </div>
              )}

              <div className="mt-4 border-t border-gray-100 pt-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Audit trail
                </h2>
                {s.auditTrail && s.auditTrail.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-gray-600">
                    {s.auditTrail.map((entry) => (
                      <li key={entry.id}>
                        <span className="font-medium">{entry.action}</span>
                        {entry.actor ? ` by ${entry.actor}` : ''}
                        {entry.reason ? ` — ${entry.reason}` : ''}
                        {entry.createdAt
                          ? ` (${new Date(entry.createdAt).toLocaleString()})`
                          : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">
                    No audit entries yet.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
