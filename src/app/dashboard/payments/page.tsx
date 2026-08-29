'use client';

import { useEffect, useState } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { FormField } from '@/components/FormField';
import Modal from '@/components/Modal';
import { SkeletonList } from '@/components/Skeleton';
import { getErrorMessage } from '@/lib/errors';
import Modal from '@/components/Modal';
import { SkeletonList } from '@/components/Skeleton';
import type { Payment } from '@/lib/types';

const PAYMENT_TABLE_COLUMNS = 5;

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({ amountUsd: '', description: '', customerEmail: '', expiryMinutes: '30' });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await paymentsApi.list(p, 20);
      setPayments(data.payments);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const createPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const amountUsd = parseFloat(form.amountUsd);
      if (Number.isNaN(amountUsd) || amountUsd <= 0) {
        toast.error('Enter a valid amount');
        return;
      }
      const { data } = await paymentsApi.create({
        amountUsd,
        description: form.description || undefined,
        customerEmail: form.customerEmail || undefined,
        expiryMinutes: parseInt(form.expiryMinutes, 10),
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
              min="5"
              max="1440"
              value={form.expiryMinutes}
              onChange={(e) => setForm({ ...form, expiryMinutes: e.target.value })}
            />
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
            <p className="text-xs text-gray-500 mb-3">{selectedPayment.reference}</p>
            <div className="bg-gray-50 rounded-lg p-3 text-left">
              <p className="text-xs text-gray-500 mb-1">Stellar Memo (required)</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-bold flex-1">{selectedPayment.stellarMemo}</code>
                <button onClick={() => copyMemo(selectedPayment.stellarMemo)}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Send to: {selectedPayment.stellarDepositAddress?.slice(0, 8)}...{selectedPayment.stellarDepositAddress?.slice(-6)}</p>
          </>
        )}
      </Modal>

      <div className="card">
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <SkeletonList rows={6} />
          ) : payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No payments yet</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="px-6 py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500">{p.reference}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? DEFAULT_STATUS_COLOR}`}>
                    {p.status}
                  </span>
                </div>
                <div className="font-semibold">{formatUsd(p.amountUsd)}</div>
                <div className="text-xs text-gray-500">{formatDate(p.createdAt)}</div>
                {p.status === 'pending' && (
                  <button onClick={() => setSelectedPayment(p)} className="text-brand-600 text-xs hover:underline">
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
                <tr><td colSpan={PAYMENT_TABLE_COLUMNS} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={PAYMENT_TABLE_COLUMNS} className="px-6 py-8 text-center text-gray-400">No payments yet</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} data-testid={`payment-row-${p.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{p.reference}</td>
                    <td className="px-6 py-4 font-semibold">{formatUsd(p.amountUsd)}</td>
                    <td className="px-6 py-4">
                      <span data-testid="payment-status-badge" className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? DEFAULT_STATUS_COLOR}`}>
                        {p.status}
                      </span>
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
        {showPagination && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
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
    </div>
  );
}
