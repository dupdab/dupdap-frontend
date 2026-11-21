'use client';

import {
  Plus,
  Copy,
  Check,
  Link as LinkIcon,
  Share2,
  Mail,
  MessageCircle,
  Search,
  X,
  Download,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { memo, useEffect, useState } from 'react';

import { CopyButton } from '@/components/CopyButton';
import { FormField } from '@/components/FormField';
import Modal from '@/components/Modal';
import { SkeletonList, SkeletonTableRows } from '@/components/Skeleton';
import { paymentsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import toast from '@/lib/toast';
import type { Payment } from '@/lib/types';
import {
  formatUsd,
  formatDate,
  PAYMENT_STATUS_COLORS,
  STATUS_ICONS,
  DEFAULT_STATUS_COLOR,
} from '@/lib/utils';

const PAYMENT_TABLE_COLUMNS = 5;
const MAX_DESCRIPTION_LENGTH = 255;

const EXPIRY_MIN_MINUTES = 5;
const EXPIRY_MAX_MINUTES = 1440;

// Maximum length for the optional payment description. Kept in sync with the
// backend limit so the customer-facing pay page card never overflows (#396).
const DESCRIPTION_MAX_LENGTH = 200;

// ---------------------------------------------------------------------------
// CSV export helpers
// ---------------------------------------------------------------------------

/** Wrap a cell value in double-quotes and escape internal double-quotes. */
function csvEscape(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Fetch every page of payments, convert to CSV, and trigger a browser
 * download named `dupdub-payments-YYYY-MM-DD.csv`.
 * Returns an error message string on failure, or null on success.
 */
async function exportPaymentsCsv(
  formatUsdFn: (v: number) => string,
  formatDateFn: (v: string) => string
): Promise<string | null> {
  const PAGE_SIZE = 20;
  const allPayments: Payment[] = [];

  try {
    // Fetch first page to learn the total count
    const first = await paymentsApi.list(1, PAGE_SIZE);
    allPayments.push(...first.data.payments);
    const total: number = first.data.total;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Fetch remaining pages in sequence to avoid hammering the API
    for (let p = 2; p <= totalPages; p++) {
      const { data } = await paymentsApi.list(p, PAGE_SIZE);
      allPayments.push(...data.payments);
    }

    const header =
      'Reference,Amount (USD),Status,Description,Customer Email,Stellar Memo,Created At,Updated At';
    const rows = allPayments.map((p) =>
      [
        csvEscape(p.reference),
        csvEscape(formatUsdFn(p.amountUsd)),
        csvEscape(p.status),
        csvEscape(p.description),
        csvEscape(p.customerEmail),
        csvEscape(p.stellarMemo),
        csvEscape(formatDateFn(p.createdAt)),
        csvEscape(p.updatedAt ? formatDateFn(p.updatedAt) : ''),
      ].join(',')
    );

    const csvContent = [header, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const a = document.createElement('a');
    a.href = url;
    a.download = `dupdub-payments-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Failed to export payments';
  }
}

// ---------------------------------------------------------------------------
// Memoized row components — re-render only when the payment data or the
// callback reference changes, not on modal open/close or filter typing in
// the parent.
// ---------------------------------------------------------------------------

interface PaymentRowProps {
  payment: Payment;
  onShowQr: (payment: Payment) => void;
}

interface PaymentStatusBadgeProps {
  status: string;
  testId?: string;
}

function PaymentStatusBadge({ status, testId }: PaymentStatusBadgeProps) {
  const StatusIcon = STATUS_ICONS[status];

  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR}`}
    >
      {StatusIcon && (
        <StatusIcon aria-hidden="true" className="w-3 h-3 shrink-0" />
      )}
      {status}
    </span>
  );
}

/** Desktop table row */
const PaymentTableRow = memo(function PaymentTableRow({
  payment: p,
  onShowQr,
}: PaymentRowProps) {
  return (
    <tr
      key={p.id}
      data-testid={`payment-row-${p.id}`}
      className="hover:bg-gray-50"
    >
      <td className="px-6 py-4 font-mono text-xs">{p.reference}</td>
      <td className="px-6 py-4 font-semibold">{formatUsd(p.amountUsd)}</td>
      <td className="px-6 py-4">
        <PaymentStatusBadge status={p.status} testId="payment-status-badge" />
      </td>
      <td className="px-6 py-4 text-gray-500">{formatDate(p.createdAt)}</td>
      <td className="px-6 py-4">
        {p.status === 'pending' && (
          <button
            data-testid={`show-qr-button-${p.id}`}
            onClick={() => onShowQr(p)}
            className="text-brand-600 text-xs hover:underline"
          >
            Show QR
          </button>
        )}
      </td>
    </tr>
  );
});

/** Mobile card */
const PaymentMobileCard = memo(function PaymentMobileCard({
  payment: p,
  onShowQr,
}: PaymentRowProps) {
  return (
    <div key={p.id} className="px-6 py-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-500">{p.reference}</span>
        <PaymentStatusBadge status={p.status} />
      </div>
      <div className="font-semibold">{formatUsd(p.amountUsd)}</div>
      <div className="text-xs text-gray-500">{formatDate(p.createdAt)}</div>
      {p.status === 'pending' && (
        <button
          onClick={() => onShowQr(p)}
          className="text-brand-600 text-xs hover:underline"
        >
          Show QR
        </button>
      )}
    </div>
  );
});

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    amountUsd: '',
    description: '',
    customerEmail: '',
    expiryMinutes: '30',
  });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      setError('');
      const { data } = await paymentsApi.list(p, 20);
      setPayments(data.payments);
      setTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err) || "Couldn't load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);
  // Client-side search filter — matches reference (case-insensitive) or
  // amountUsd. The API paginates server-side, so this filters within the
  // current page's results. This lets merchants quickly locate a specific
  // payment on the visible page without scrolling through all rows.
  const filteredPayments = searchQuery.trim()
    ? payments.filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.reference.toLowerCase().includes(q) ||
          String(p.amountUsd).includes(q)
        );
      })
    : payments;

  // Reset the copy-success indicator whenever a different payment is selected
  // (or the modal is closed), so a stale checkmark from a previous selection
  // never appears on the newly opened payment.
  useEffect(() => {
    setCopied(false);
  }, [selectedPayment]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await paymentsApi.create({
        amountUsd: parseFloat(form.amountUsd),
        description: form.description || undefined,
        customerEmail: form.customerEmail || undefined,
        expiryMinutes: parseInt(form.expiryMinutes, 10),
      });
      setShowCreate(false);
      setForm({
        amountUsd: '',
        description: '',
        customerEmail: '',
        expiryMinutes: '30',
      });
      setSelectedPayment(data.payment);
      load(page);
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to create payment');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const err = await exportPaymentsCsv(formatUsd, formatDate);
    setExporting(false);
    if (err) {
      toast.error(err);
    } else {
      toast.success('Payments exported');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage payment links
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Payment
          </button>
        </div>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by reference or amount…"
          aria-label="Search payments"
          className="input pl-9 pr-9 w-full"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <>
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <SkeletonTableRows rows={5} columns={PAYMENT_TABLE_COLUMNS} />
              </tbody>
            </table>
          </div>
          <div className="md:hidden card divide-y divide-gray-100">
            <SkeletonList count={5} />
          </div>
        </>
      ) : filteredPayments.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">
            {searchQuery
              ? 'No payments match your search.'
              : 'No payments yet. Create your first payment link.'}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">Payments</caption>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((p) => (
                  <PaymentTableRow
                    key={p.id}
                    payment={p}
                    onShowQr={setSelectedPayment}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden card divide-y divide-gray-100">
            {filteredPayments.map((p) => (
              <PaymentMobileCard
                key={p.id}
                payment={p}
                onShowQr={setSelectedPayment}
              />
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Payment"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField
            label="Amount (USD)"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.amountUsd}
            onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
          />
          <FormField
            label="Description (optional)"
            value={form.description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <FormField
            label="Customer Email (optional)"
            type="email"
            value={form.customerEmail}
            onChange={(e) =>
              setForm({ ...form, customerEmail: e.target.value })
            }
          />
          <FormField
            label="Expiry (minutes)"
            type="number"
            min={EXPIRY_MIN_MINUTES}
            max={EXPIRY_MAX_MINUTES}
            value={form.expiryMinutes}
            onChange={(e) =>
              setForm({ ...form, expiryMinutes: e.target.value })
            }
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Payment Link"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${selectedPayment.reference}`}
                size={200}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${selectedPayment.reference}`}
                aria-label="Payment link"
                className="input flex-1 font-mono text-xs"
              />
              <CopyButton
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${selectedPayment.reference}`}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
