'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from '@/lib/toast';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import type { Payment } from '@/lib/types';

interface PaymentDetailPanelProps {
  payment: Payment | null;
  onClose: () => void;
}

/**
 * Right-hand slide-over showing full payment detail, Stellar memo, QR code and
 * actions, so merchants can inspect a payment without leaving the list.
 */
export default function PaymentDetailPanel({ payment, onClose }: PaymentDetailPanelProps) {
  const [copied, setCopied] = useState<'memo' | 'link' | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = !!payment;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    setCopied(null);
  }, [payment]);

  if (!payment) return null;

  const payUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${payment.id}`;

  const copy = async (kind: 'memo' | 'link', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(kind === 'memo' ? 'Failed to copy memo' : 'Failed to copy link');
    }
  };

  const rows: Array<[string, string | undefined]> = [
    ['Reference', payment.reference],
    ['Amount (USD)', formatUsd(payment.amountUsd)],
    ['Amount (XLM)', payment.amountXlm !== undefined ? String(payment.amountXlm) : undefined],
    ['Description', payment.description],
    ['Customer email', payment.customerEmail],
    ['Created', formatDate(payment.createdAt)],
    ['Expires', payment.expiresAt ? formatDate(payment.expiresAt) : undefined],
    ['Deposit address', payment.stellarDepositAddress],
  ];

  return (
    <div className="fixed inset-0 z-50" data-testid="payment-detail-panel-root">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
        data-testid="payment-detail-panel"
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Payment details</h2>
          <button
            ref={closeRef}
            type="button"
            data-testid="payment-detail-close"
            onClick={onClose}
            aria-label="Close payment details"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <span
          className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? DEFAULT_STATUS_COLOR}`}
        >
          {payment.status}
        </span>

        <dl className="space-y-3 text-sm">
          {rows.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="text-xs uppercase text-gray-500">{label}</dt>
                <dd className="text-gray-900 break-all">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>

        {payment.stellarMemo && (
          <div>
            <p className="text-xs uppercase text-gray-500 mb-1">Stellar memo</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono break-all">{payment.stellarMemo}</code>
              <button
                type="button"
                data-testid="detail-copy-memo"
                onClick={() => copy('memo', payment.stellarMemo)}
                className="text-brand-600 text-xs hover:underline shrink-0"
              >
                {copied === 'memo' ? 'Copied' : 'Copy memo'}
              </button>
            </div>
          </div>
        )}

        {(payment.qrCode || payment.stellarDepositAddress) && (
          <div className="bg-white p-4 rounded-lg border border-gray-100 inline-block">
            <QRCodeSVG value={payment.qrCode ?? payment.stellarDepositAddress ?? ''} size={180} />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            data-testid="detail-copy-link"
            onClick={() => copy('link', payUrl)}
            className="btn-secondary text-sm px-3 py-1"
          >
            {copied === 'link' ? 'Link copied' : 'Copy payment link'}
          </button>
          <a href={payUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm px-3 py-1">
            Open pay page
          </a>
        </div>
      </aside>
    </div>
  );
}
