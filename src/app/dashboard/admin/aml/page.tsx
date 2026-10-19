'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type AmlStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';

const STATUSES: AmlStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED'];

interface AmlFlag {
  id: string;
  merchantId: string;
  merchantName?: string;
  paymentId?: string;
  reason: string;
  status: AmlStatus;
  raisedAt: string;
}

const statusStyles: Record<AmlStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  ESCALATED: 'bg-purple-100 text-purple-700',
};

export default function AdminAmlPage() {
  const { token } = useAuthStore();
  const [flags, setFlags] = useState<AmlFlag[]>([]);
  const [statusFilter, setStatusFilter] = useState<AmlStatus | 'ALL'>('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/aml/flags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load AML flags');
      const data = await res.json();
      setFlags(Array.isArray(data) ? data : data.flags ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AML flags');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const markReviewed = async (id: string) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_URL}/admin/aml/flags/${id}/review`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      setFlags((prev) =>
        prev.map((flag) => (flag.id === id ? { ...flag, status: 'RESOLVED' } : flag)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleFlags = useMemo(
    () =>
      statusFilter === 'ALL'
        ? flags
        : flags.filter((flag) => flag.status === statusFilter),
    [flags, statusFilter],
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">AML Flags</h1>
        <button
          type="button"
          onClick={loadFlags}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1 text-sm rounded-full border ${
            statusFilter === 'ALL'
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          All
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 text-sm rounded-full border ${
              statusFilter === status
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div role="status" className="py-12 flex justify-center" aria-busy="true">
          <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      ) : visibleFlags.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">No AML flags found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Merchant</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Payment</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Raised at</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibleFlags.map((flag) => (
                <tr key={flag.id}>
                  <td className="px-4 py-3 text-gray-900">
                    {flag.merchantName || flag.merchantId}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{flag.paymentId || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{flag.reason}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(flag.raisedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[flag.status]}`}
                    >
                      {flag.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => markReviewed(flag.id)}
                      disabled={updatingId === flag.id || flag.status === 'RESOLVED'}
                      className="px-3 py-1 text-xs rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {updatingId === flag.id ? 'Saving…' : 'Mark as reviewed'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
