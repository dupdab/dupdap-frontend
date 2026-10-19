'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import toast from '@/lib/toast';
import { QRCodeSVG } from 'qrcode.react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, STATUS_ICONS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { FormField } from '@/components/FormField';
import Modal from '@/components/Modal';
import PaymentDetailPanel from '@/components/PaymentDetailPanel';
import { SkeletonList } from '@/components/Skeleton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
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
  /** Roving-tabindex focus state for keyboard navigation (#576). */
  isFocused?: boolean;
  onFocusRow?: (payment: Payment) => void;
  onKeyDownRow?: (e: React.KeyboardEvent<HTMLTableRowElement>, payment: Payment) => void;
  rowRef?: (el: HTMLTableRowElement | null) => void;
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

/** Desktop table row */
const PaymentTableRow = memo(function PaymentTableRow({
  payment: p,
  onShowQr,
  isFocused,
  onFocusRow,
  onKeyDownRow,
  rowRef,
}: PaymentRowProps) {
  return (
    <tr
      key={p.id}
      ref={rowRef}
      data-testid={`payment-row-${p.id}`}
      tabIndex={isFocused ? 0 : -1}
      aria-selected={isFocused}
      onFocus={() => onFocusRow?.(p)}
      onKeyDown={(e) => onKeyDownRow?.(e, p)}
      className={`hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset ${isFocused ? 'bg-brand-50' : ''}`}
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

/** Parse a numeric amount filter value; returns null for empty/invalid input. */
function parseAmountFilter(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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
  // Amount range filter inputs (#578).
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  // Roving-tabindex focus index for keyboard navigation of the payments table (#576).
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

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

  // Sync amount range filter from the URL on mount so shared filtered views
  // restore the same range (#578).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const min = params.get('minAmount');
    const max = params.get('maxAmount');
    if (min !== null) setMinAmount(min);
    if (max !== null) setMaxAmount(max);
  }, []);

  // Reflect the amount range in the URL query params for shareable views (#578).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (minAmount.trim() !== '') params.set('minAmount', minAmount.trim());
    else params.delete('minAmount');
    if (maxAmount.trim() !== '') params.set('maxAmount', maxAmount.trim());
    else params.delete('maxAmount');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, [minAmount, maxAmount]);

  // Keep the roving focus index within bounds when the payment list changes.
  useEffect(() => {
    setFocusedRowIndex((idx) => (idx >= payments.length ? 0 : idx));
  }, [payments.length]);

  // Reset the copy-success indicator whenever a different payment is selected
  // (or the modal is closed), so a stale checkmark from a previously copied
  // memo never leaks into another payment's QR modal (#326).
  useEffect(() => {
    setCopied(false);
  }, [selectedPayment]);

  const focusRow = (index: number) => {
    if (index < 0 || index >= payments.length) return;
    setFocusedRowIndex(index);
    rowRefs.current[index]?.focus();
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, payment: Payment) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusRow(focusedRowIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusRow(focusedRowIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusRow(0);
        break;
      case 'End':
        e.preventDefault();
        focusRow(payments.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setSelectedPayment(payment);
        break;
      default:
        break;
    }
  };

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
      toast.success('Memo copied');
    } catch {
      toast.error('Failed to copy memo');
    }
  };

  const clearAllFilters = () => {
    setMinAmount('');
    setMaxAmount('');
  };

  const minAmountValue = parseAmountFilter(minAmount);
  const maxAmountValue = parseAmountFilter(maxAmount);
  const hasAmountFilter = minAmountValue !== null || maxAmountValue !== null;

  const filteredPayments = hasAmountFilter
    ? payments.filter((p) => {
        if (minAmountValue !== null && p.amountUsd < minAmountValue) return false;
        if (maxAmountValue !== null && p.amountUsd > maxAmountValue) return false;
        return true;
      })
    : payments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total payments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          New Payment
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="min-amount" className="block text-xs font-medium text-gray-600 mb-1">
            Min amount (USD)
          </label>
          <input
            id="min-amount"
            data-testid="min-amount-input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="0.00"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="max-amount" className="block text-xs font-medium text-gray-600 mb-1">
            Max amount (USD)
          </label>
          <input
            id="max-amount"
            data-testid="max-amount-input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="Any"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="button"
          data-testid="clear-filters-button"
          onClick={clearAllFilters}
          disabled={!hasAmountFilter}
          className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2"
        >
          Clear all filters
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
              hint={<span data-testid="description-char-counter">{form.description.length}/{MAX_DESCRIPTION_LENGTH}</span>}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <FormField
              label="Customer Email (optional)"
              type="email"
              required={false}
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
            <FormField
              label="Expires in (minutes)"
              type="number"
              aria-describedby="expiry-minutes-hint"
              value={form.expiryMinutes}
              onChange={(e) => setForm({ ...form, expiryMinutes: e.target.value })}
            />
            <p id="expiry-minutes-hint" className="text-xs text-gray-500">
              Must be a whole number between {EXPIRY_MIN_MINUTES} and {EXPIRY_MAX_MINUTES} minutes.
            </p>
            <button data-testid="create-payment-submit" type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? 'Creating...' : 'Create Payment'}
            </button>
          </fieldset>
        </form>
      </Modal>

      <Modal
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Payment QR Code"
        testId="payment-qr-modal"
        contentClassName="max-w-sm text-center"
      >
        {selectedPayment && (
          <>
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <QRCodeSVG value={selectedPayment.qrCode ?? selectedPayment.stellarDepositAddress ?? ''} size={200} />
            </div>
            <p className="text-sm font-semibold mb-1">{formatUsd(selectedPayment.amountUsd)}</p>
            <p className="text-xs text-gray-500 mb-4">{selectedPayment.reference}</p>
            {selectedPayment.stellarMemo && (
              <div className="flex items-center justify-center gap-2">
                <code className="text-xs font-mono break-all">{selectedPayment.stellarMemo}</code>
                <button
                  type="button"
                  data-testid="copy-memo-button"
                  data-copied={copied}
                  onClick={() => copyMemo(selectedPayment.stellarMemo!)}
                  aria-label={copied ? 'Memo copied' : 'Copy memo'}
                  className="text-brand-600 text-xs hover:underline shrink-0"
                >
                  {copied ? 'Copied' : 'Copy memo'}
                </button>
              </div>
            )}
          </>
        )}
      </Modal>

      <PaymentDetailPanel payment={detailPayment} onClose={() => setDetailPayment(null)} />

      <div className="card">
        {error ? (
          <div data-testid="payments-error" className="px-6 py-4 text-sm text-red-500">
            {error}
          </div>
        ) : null}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <SkeletonList rows={6} />
          ) : error ? null : payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No payments yet</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="px-6 py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <button type="button" data-testid="mobile-payment-details" onClick={() => setDetailPayment(p)} className="font-mono text-xs text-gray-500 hover:underline">{p.reference}</button>
                  <PaymentStatusBadge status={p.status} />
                </div>
                <div className="font-semibold">{formatUsd(p.amountUsd)}</div>
                <div className="text-xs text-gray-500">{formatDate(p.createdAt)}</div>
                {p.status === 'pending' && (
                  <button
                    data-testid="view-qr-button"
                    onClick={() => setSelectedPayment(p)}
                    aria-label={`Show QR code for ${p.reference}`}
                    className="text-brand-600 text-xs hover:underline"
                  >
                    Show QR
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={PAYMENT_TABLE_COLUMNS} className="px-6 py-8 text-center text-gray-400"><LoadingSpinner showLabel /></td></tr>
              ) : error ? null : payments.length === 0 ? (
                <tr><td colSpan={PAYMENT_TABLE_COLUMNS} className="px-6 py-8 text-center text-gray-400">No payments yet</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} data-testid={`payment-row-${p.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs"><button type="button" data-testid={`payment-details-button-${p.id}`} onClick={() => setDetailPayment(p)} className="hover:underline">{p.reference}</button></td>
                    <td className="px-6 py-4 font-semibold">{formatUsd(p.amountUsd)}</td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={p.status} testId="payment-status-badge" />
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(p.createdAt)}</td>
                    <td className="px-6 py-4">
                      {p.status === 'pending' && (
                        <button data-testid={`show-qr-button-${p.id}`} onClick={() => setSelectedPayment(p)} className="text-brand-600 text-xs hover:underline">
                          Show QR
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <div className="bg-red-50 text-red-700 rounded-lg p-
        </div>
        <button
          type="button"
          data-testid="clear-filters-button"
          onClick={clearAllFilters}
          disabled={!hasAmountFilter}
          className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2"
        >
          Clear all filters
        </button>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          {hasAmountFilter ? 'No payments match the amount range.' : 'No payments yet.'}
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Reference</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((p, index) => (
                  <PaymentTableRow
                    key={p.id}
                    payment={p}
                    onShowQr={setSelectedPayment}
                    isFocused={index === focusedRowIndex}
                    onFocusRow={() => setFocusedRowIndex(index)}
                    onKeyDownRow={handleRowKeyDown}
                    rowRef={(el) => { rowRefs.current[index] = el; }}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filteredPayments.map((p) => (
              <PaymentMobileCard key={p.id} payment={p} onShowQr={setSelectedPayment} />
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <Modal title="New Payment" onClose={() => setShowCreate(false)}>
          <form onSubmit={createPayment} className="space-y-4">
            <FormField label="Amount (USD)" htmlFor="amount-usd">
              <input
                id="amount-usd"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amountUsd}
                onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Description (optional)" htmlFor="description">
              <input
                id="description"
                type="text"
                maxLength={DESCRIPTION_MAX_LENGTH}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Customer email (optional)" htmlFor="customer-email">
              <input
                id="customer-email"
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Expiry (minutes)" htmlFor="expiry-minutes">
              <input
                id="expiry-minutes"
                type="number"
                min={EXPIRY_MIN_MINUTES}
                max={EXPIRY_MAX_MINUTES}
                step="1"
                value={form.expiryMinutes}
                onChange={(e) => setForm({ ...form, expiryMinutes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedPayment && (
        <Modal title="Payment QR" onClose={() => setSelectedPayment(null)}>
          <div className="space-y-4 text-center">
            <div className="font-mono text-xs text-gray-500">{selectedPayment.reference}</div>
            <div className="font-semibold">{formatUsd(selectedPayment.amountUsd)}</div>
            <div className="flex justify-center">
              <QRCodeSVG value={selectedPayment.payUrl ?? selectedPayment.reference} size={192} />
            </div>
            {selectedPayment.memo && (
              <button
                type="button"
                onClick={() => copyMemo(selectedPayment.memo as string)}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy memo'}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
