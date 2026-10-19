'use client';

import { memo, useEffect, useState } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import toast from '@/lib/toast';
import { QRCodeSVG } from 'qrcode.react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, STATUS_ICONS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { FormField } from '@/components/FormField';
import Modal from '@/components/Modal';
import { SkeletonList } from '@/components/Skeleton';
import { getErrorMessage } from '@/lib/errors';
import type { Payment } from '@/lib/types';

const PAYMENT_TABLE_COLUMNS = 5;
const MAX_DESCRIPTION_LENGTH = 255;

const EXPIRY_MIN_MINUTES = 5;
const EXPIRY_MAX_MINUTES = 1440;

// Maximum length for the optional payment description. Kept in sync with the
// backend limit so the customer-facing pay page card never overflows (#396).
const DESCRIPTION_MAX_LENGTH = 200;

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
      {StatusIcon && <StatusIcon aria-hidden="true" className="w-3 h-3 shrink-0" />}
      {status}
    </span>
  );
}

/**
 * Payment reference QR code for the printed merchant receipt (#580).
 * Rendered only in print view (hidden on screen via `hidden print:block`)
 * so it doesn't consume screen space but appears on the printed receipt.
 */
function ReceiptQrCode({ paymentId }: { paymentId: string }) {
  const payUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/pay/${paymentId}`
    : `/pay/${paymentId}`;

  return (
    <div className="hidden print:block mt-4" data-testid="receipt-qr-code">
      <QRCodeSVG value={payUrl} size={96} level="M" />
      <p className="text-xs text-gray-500 mt-1 font-mono">{payUrl}</p>
    </div>
  );
}

/** Desktop table row */
const PaymentTableRow = memo(function PaymentTableRow({ payment: p, onShowQr }: PaymentRowProps) {
  return (
    <tr key={p.id} data-testid={`payment-row-${p.id}`} className="hover:bg-gray-50">
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
const PaymentMobileCard = memo(function PaymentMobileCard({ payment: p, onShowQr }: PaymentRowProps) {
  return (
    <div key={p.id} className="px-6 py-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-500">{p.reference}</span>
        <PaymentStatusBadge status={p.status} />
      </div>
      <div className="font-semibold">{formatUsd(p.amountUsd)}</div>
      <div className="text-xs text-gray-500">{formatDate(p.createdAt)}</div>
      {p.status === 'pending' && (
        <button onClick={() => onShowQr(p)} className="text-brand-600 text-xs hover:underline">
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
  const [form, setForm] = useState({ amountUsd: '', description: '', customerEmail: '', expiryMinutes: '30' });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => { load(page); }, [page]);

  // Reset the copy-success indicator whenever a different payment is selected
  // (or the modal is closed), so a stale checkmark from a previously copied
  // memo never leaks into another payment's QR modal (#326).
  useEffect(() => {
    setCopied(false);
  }, [selectedPayment]);

  const createPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const amountUsd = parseFloat(form.amountUsd);
      if (Number.isNaN(amountUsd) || amountUsd <= 0) {
        toast.error('Enter a valid amount');
        return;
      }
      const expiryMinutes = parseInt(form.expiryMinutes, 10);
      if (
        !Number.isFinite(expiryMinutes) ||
        !Number.isInteger(expiryMinutes) ||
        expiryMinutes < EXPIRY_MIN_MINUTES ||
        expiryMinutes > EXPIRY_MAX_MINUTES
      ) {
        toast.error(`Expiry must be a whole number between ${EXPIRY_MIN_MINUTES} and ${EXPIRY_MAX_MINUTES} minutes`);
        return;
      }
      const { data } = await paymentsApi.create({
        amountUsd,
        description: form.description || undefined,
        customerEmail: form.customerEmail || undefined,
        expiryMinutes,
      });
      setSelectedPayment(data);
      setShowCreate(false);
      setForm({ amountUsd: '', description: '', customerEmail: '', expiryMinutes: '30' });
      setPage(1);
      load(1);
      toast.success('Payment created');
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to create payment');
    } finally {
      setCreating(false);
    }
  };

  const copyMemo = async (memo: string) => {
    try {
      await navigator.clipboard.writeText(memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy memo');
    }
  };

  const showPagination = total > 20 || page > 1;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total payments</p>
        </div>
        <button data-testid="new-payment-button" onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Payment
        </button>
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Payment"
        testId="create-payment-modal"
      >
        <form onSubmit={createPayment} className="space-y-4" aria-busy={creating}>
          {/* Visually-hidden live region announces submit outcomes to screen readers (#158) */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {creating ? 'Creating payment, please wait…' : ''}
          </p>
          <fieldset disabled={creating} className="space-y-4">
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
              type="text"
              required={false}
              maxLength={MAX_DESCRIPTION_LENGTH}
              hint={<span data-testid="description-char-counter">{form.description.length}/{DESCRIPTION_MAX_LENGTH}</span>}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <FormField
              label="Customer email (optional)"
              type="email"
              required={false}
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
            <FormField
              label="Expiry (minutes)"
              type="number"
              min={String(EXPIRY_MIN_MINUTES)}
              max={String(EXPIRY_MAX_MINUTES)}
              required
              value={form.expiryMinutes}
              onChange={(e) => setForm({ ...form, expiryMinutes: e.target.value })}
            />
            <button type="submit" className="btn-primary w-full" disabled={creating}>
              {creating ? 'Creating…' : 'Create Payment'}
            </button>
          </fieldset>
        </form>
      </Modal>

      <Modal
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Payment QR Code"
        testId="payment-qr-modal"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? `${window.location.origin}/pay/${selectedPayment.id}` : `/pay/${selectedPayment.id}`}
                size={192}
                level="M"
              />
              <p className="text-xs text-gray-500 font-mono">{selectedPayment.reference}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{formatUsd(selectedPayment.amountUsd)}</span>
              <PaymentStatusBadge status={selectedPayment.status} />
            </div>
            <button
              onClick={() => copyMemo(selectedPayment.reference)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy reference'}
            </button>
            <ReceiptQrCode paymentId={selectedPayment.id} />
          </div>
        )}
      </Modal>

      {loading ? (
        <SkeletonList rows={PAYMENT_TABLE_COLUMNS} />
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No payments yet.</div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((p) => (
                  <PaymentTableRow key={p.id} payment={p} onShowQr={setSelectedPayment} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden bg-white rounded-lg shadow divide-y divide-gray-200">
            {payments.map((p) => (
              <PaymentMobileCard key={p.id} payment={p} onShowQr={setSelectedPayment} />
            ))}
          </div>
          {showPagination && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((n) => Math.max(1, n - 1))}
                disabled={page <= 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                disabled={page >= totalPages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
