'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import type { Payment } from '@/lib/types';

export default function PayPage({ params }: { params: { paymentId: string } }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await paymentsApi.get(params.paymentId);
        if (!cancelled) setPayment(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err) ?? 'Failed to load payment');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params.paymentId]);

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy — please copy it manually');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading payment…</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700">{error ?? 'Payment not found'}</p>
        </div>
      </div>
    );
  }

  const statusColor = PAYMENT_STATUS_COLORS[payment.status] ?? DEFAULT_STATUS_COLOR;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm max-w-md w-full p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Complete your payment</h1>
          <p className="text-sm text-gray-500 mt-1">Reference {payment.reference}</p>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{formatUsd(payment.amountUsd)}</p>
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
            {payment.status}
          </span>
        </div>

        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg border">
            <QRCodeSVG value={payment.qrCode ?? payment.stellarDepositAddress ?? ''} size={200} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Deposit address</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 rounded px-3 py-2 break-all">
                {payment.stellarDepositAddress}
              </code>
              <button
                type="button"
                onClick={() => copy(payment.stellarDepositAddress ?? '', 'address')}
                className="p-2 text-gray-500 hover:text-brand-600"
                aria-label="Copy deposit address"
              >
                {copiedField === 'address' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {payment.memo && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Memo (required)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-50 rounded px-3 py-2 break-all">{payment.memo}</code>
                <button
                  type="button"
                  onClick={() => copy(payment.memo ?? '', 'memo')}
                  className="p-2 text-gray-500 hover:text-brand-600"
                  aria-label="Copy memo"
                >
                  {copiedField === 'memo' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Created {formatDate(payment.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
