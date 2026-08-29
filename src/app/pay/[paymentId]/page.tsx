'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, CheckCircle, XCircle, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatUsd } from '@/lib/utils';
import type { Payment } from '@/lib/types';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-8 h-8 text-yellow-500" />,
  confirmed: <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />,
  settling: <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />,
  settled: <CheckCircle className="w-8 h-8 text-green-500" />,
  failed: <XCircle className="w-8 h-8 text-red-500" />,
  expired: <XCircle className="w-8 h-8 text-gray-400" />,
};

const DEFAULT_STATUS_ICON = <Clock className="w-8 h-8 text-gray-400" />;

function computeExpiresAt(payment: any): Date | null {
  if (payment?.expiresAt) return new Date(payment.expiresAt);
  if (payment?.expiryMinutes && payment?.createdAt) {
    return new Date(new Date(payment.createdAt).getTime() + payment.expiryMinutes * 60_000);
  }
  return null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PayPage({ params }: { params: { paymentId: string } }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [pollWarning, setPollWarning] = useState<string>('');

  useEffect(() => {
    let pollAttempts = 0;
    paymentsApi.getByReference(params.paymentId)
      .then(({ data }) => setPayment(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      pollAttempts += 1;
      if (pollAttempts >= 24) {
        setPollWarning('Status checks are taking longer than expected.');
        clearInterval(interval);
        return;
      }
      paymentsApi.getByReference(params.paymentId)
        .then(({ data }) => {
          setPollWarning('');
          setPayment(data);
          if (['settled', 'failed', 'expired'].includes(data.status)) clearInterval(interval);
        })
        .catch(() => {
          setPollWarning('We are having trouble checking your payment status right now.');
        });
    }, 5000);

    return () => clearInterval(interval);
  }, [params.paymentId]);

  const expiresAt = payment ? computeExpiresAt(payment) : null;
  const isPending = payment?.status === 'pending';
  const remainingMs = expiresAt ? expiresAt.getTime() - now : 0;
  const isExpiredByClock = isPending && expiresAt ? remainingMs <= 0 : false;

  useEffect(() => {
    if (!isPending || !expiresAt) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [isPending, expiresAt]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {loadError ? 'Something went wrong loading this payment — try again' : 'Payment not found'}
          </p>
        </div>
      </div>
    );
  }

  const stellarUri = `web+stellar:pay?destination=${encodeURIComponent(payment.stellarDepositAddress ?? '')}&amount=${encodeURIComponent(String(payment.amountXlm ?? payment.amountUsd))}&memo=${encodeURIComponent(payment.stellarMemo)}&memo_type=text`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-[92vw] xs:max-w-sm">
        <div className="p-4 xs:p-6 border-b border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">DupDub</p>
          <h1 className="text-3xl font-bold mt-1">{formatUsd(payment.amountUsd)}</h1>
          {payment.description && <p className="text-sm text-gray-500 mt-1">{payment.description}</p>}
        </div>

        <div className="p-4 xs:p-6">
          {isPending ? (
            <>
              {expiresAt && (
                <div className={`flex items-center justify-center gap-2 rounded-lg p-3 mb-4 text-sm font-semibold ${
                  isExpiredByClock ? 'bg-red-50 text-red-700 border border-red-200' : remainingMs < 60_000 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {isExpiredByClock ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {isExpiredByClock ? 'This payment request has expired' : <>Expires in {formatRemaining(remainingMs)}</>}
                </div>
              )}

              <div className="flex justify-center mb-4">
                <div
                  className="bg-white p-3 rounded-xl border border-gray-200"
                  role="img"
                  aria-label={`Stellar payment QR code for ${formatUsd(payment.amountUsd)}`}
                >
                  <QRCodeSVG value={stellarUri} size={160} />
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 mb-4">
                Scan with a Stellar wallet app, then approve USDC before deposit
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs mb-4">
                <p className="font-semibold text-blue-900 mb-1">Required customer flow</p>
                <p className="text-blue-800">1) approve(escrow_contract, amount)</p>
                <p className="text-blue-800">2) deposit()</p>
                <p className="text-blue-700 mt-1">
                  Your wallet signs both steps. No private keys are shared with DupDub.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-3">
                <p className="text-xs text-gray-500 mb-1">Deposit address (exact)</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold break-all flex-1 text-gray-900">{payment.stellarDepositAddress}</code>
                  <button
                    onClick={() => copy(payment.stellarDepositAddress ?? '', 'address')}
                    aria-label="Copy deposit address"
                    className="shrink-0"
                  >
                    {copied === 'address' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                <p className="font-semibold text-amber-800 mb-1">Important: Include memo</p>
                <div className="flex items-center gap-2">
                  <code className="text-amber-900 font-bold text-sm break-all flex-1">{payment.stellarMemo}</code>
                  <button
                    onClick={() => copy(payment.stellarMemo, 'memo')}
                    aria-label="Copy memo"
                    className="shrink-0"
                  >
                    {copied === 'memo' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-amber-600" />}
                  </button>
                </div>
                <p className="text-amber-700 mt-1">Payment will not be detected without the memo.</p>
              </div>
              {pollWarning ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mt-4">
                  {pollWarning}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="flex justify-center mb-3">{STATUS_ICONS[payment.status] ?? DEFAULT_STATUS_ICON}</div>
              <p className="font-semibold text-gray-900 capitalize">{payment.status}</p>
              <p className="text-sm text-gray-500 mt-1">
                {payment.status === 'settled' && 'Payment complete. Thank you!'}
                {payment.status === 'confirmed' && 'Payment detected. Processing settlement...'}
                {payment.status === 'settling' && 'Converting to fiat and transferring...'}
                {payment.status === 'failed' && 'Payment failed. Please contact the merchant.'}
                {payment.status === 'expired' && 'This payment request has expired.'}
                {!['settled', 'confirmed', 'settling', 'failed', 'expired'].includes(payment.status) && 'Checking payment status...'}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-4 text-center text-xs text-gray-400">
          Ref: {payment.reference}
        </div>
      </div>
    </div>
  );
}
