'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const PAGE_SIZE = 20;

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
}

function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Downloads the given payments as a CSV file (#792). */
function downloadPaymentsCsv(rows: Payment[]): void {
  const header = ['ID', 'Amount', 'Currency', 'Status', 'Created At'];
  const lines = rows.map((p) =>
    [p.id, p.amount, p.currency, p.status, p.createdAt].map(csvEscape).join(',')
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default function PaymentsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePage(searchParams.get('page'));

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        const res = await fetch(`/api/payments?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load payments (${res.status})`);
        }
        const data: PaymentsResponse = await res.json();
        if (!cancelled) {
          setPayments(data.payments ?? []);
          setTotal(data.total ?? 0);
          setSelectedIds(new Set());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load payments');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [page]);

  const goToPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  // ── Bulk selection (#792) ────────────────────────────────────────────
  const selectedPayments = payments.filter((p) => selectedIds.has(p.id));
  const allSelected =
    payments.length > 0 && selectedPayments.length === payments.length;
  const someSelected = selectedPayments.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(payments.map((p) => p.id)));
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const summary = useMemo(() => {
    if (total === 0) {
      return 'No payments';
    }
    return `Showing ${rangeStart}\u2013${rangeEnd} of ${total} payments`;
  }, [rangeStart, rangeEnd, total]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading payments\u2026</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-gray-500">No payments found.</p>
      ) : (
        <>
          {selectedPayments.length > 0 ? (
            <div
              role="toolbar"
              aria-label="Bulk actions"
              data-testid="payments-bulk-bar"
              className="flex items-center justify-between rounded-md bg-gray-100 px-3 py-2"
            >
              <span className="text-sm text-gray-700">
                {selectedPayments.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPaymentsCsv(selectedPayments)}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Export selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
                >
                  Clear selection
                </button>
              </div>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              aria-label="Select all payments"
            />
            Select all
          </label>
        <ul className="divide-y divide-gray-200">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between py-3">
              <input
                type="checkbox"
                checked={selectedIds.has(payment.id)}
                onChange={() => toggleSelected(payment.id)}
                aria-label={`Select payment ${payment.id}`}
              />
              <span className="text-sm text-gray-900">{payment.id}</span>
              <span className="text-sm text-gray-700">
                {payment.amount} {payment.currency}
              </span>
              <span className="text-sm text-gray-500">{payment.status}</span>
            </li>
          ))}
        </ul>
        </>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-600">{summary}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => goToPage(page - 1)}
            disabled={loading || page <= 1}
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => goToPage(page + 1)}
            disabled={loading || page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
