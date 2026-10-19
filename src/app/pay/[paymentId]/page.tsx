'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  WifiOff,
  Printer,
  Download,
} from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate } from '@/lib/utils';
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

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 24;
const POLL_MAX_BACKOFF_MS = 60_000;

/**
 * Number of consecutive poll failures before we show the network degradation
 * banner. Two failures correspond to roughly 10 s of silence — enough to
 * distinguish a transient hiccup from a real outage without alarming customers
 * on a normal 5-s retry bounce.
 */
const DEGRADED_FAILURE_THRESHOLD = 2;

function computeExpiresAt(payment: Payment): Date | null {
  if (payment.expiresAt) return new Date(payment.expiresAt);
  if (payment.expiryMinutes && payment.createdAt) {
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

// ─── Network degradation banner ────────────────────────────────────────────

interface DegradedBannerProps {
  visible: boolean;
}

function DegradedBanner({ visible }: DegradedBannerProps) {
  if (!visible) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="degraded-banner"
      className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-300 p-3 mb-4 text-sm text-amber-800"
    >
      <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <div>
        <p className="font-semibold">Stellar network connection issue</p>
        <p className="mt-0.5 text-xs">
          We&apos;re having trouble reaching the payment network. Your payment has
          <strong> not been lost</strong> — we&apos;ll confirm it as soon as the connection
          is restored. Please keep this page open.
        </p>
      </div>
    </div>
  );
}

// ─── Receipt ───────────────────────────────────────────────────────────────

interface ReceiptProps {
  payment: Payment;
}

function Receipt({ payment }: ReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  /** Generate a minimal text receipt and trigger a browser download. */
  const handleDownload = () => {
    const lines = [
      'DupDub Payment Receipt',
      '======================',
      `Reference:   ${payment.reference}`,
      `Amount:      ${formatUsd(payment.amountUsd)}`,
      `Status:      ${payment.status}`,
      payment.description ? `Description: ${payment.description}` : '',
      payment.customerEmail ? `Customer:    ${payment.customerEmail}` : '',
      `Date:        ${formatDate(payment.createdAt)}`,
      payment.updatedAt ? `Settled:     ${formatDate(payment.updatedAt)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dupdub-receipt-${payment.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="payment-receipt"
      className="space-y-4"
    >
      {/* Status stamp */}
      <div className="flex flex-col items-center py-6">
        <CheckCircle className="w-14 h-14 text-green-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Payment Complete</h2>
        <p className="text-sm text-gray-500 mt-1">Your payment has been confirmed and settled.</p>
      </div>

      {/* Receipt details */}
      <dl className="divide-y divide-gray-100 text-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex justify-between px-4 py-3 bg-white">
          <dt className="text-gray-500">Amount</dt>
          <dd className="font-semibold text-gray-900">{formatUsd(payment.amountUsd)}</dd>
        </div>
        <div className="flex justify-between px-4 py-3 bg-gray-50">
          <dt className="text-gray-500">Reference</dt>
          <dd className="font-mono text-gray-900 text-xs break-all">{payment.reference}</dd>
        </div>
        {payment.description && (
          <div className="flex justify-between px-4 py-3 bg-white">
            <dt className="text-gray-500">Description</dt>
            <dd className="text-gray-900 text-right max-w-[60%] break-words">{payment.description}</dd>
          </div>
        )}
        {payment.customerEmail && (
          <div className="flex justify-between px-4 py-3 bg-gray-50">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{payment.customerEmail}</dd>
          </div>
        )}
        <div className="flex justify-between px-4 py-3 bg-white">
          <dt className="text-gray-500">Date</dt>
          <dd className="text-gray-900">{formatDate(payment.createdAt)}</dd>
        </div>
        {payment.updatedAt && (
          <div className="flex justify-between px-4 py-3 bg-gray-50">
            <dt className="text-gray-500">Settled</dt>
            <dd className="text-gray-900">{formatDate(payment.updatedAt)}</dd>
          </div>
        )}
      </dl>

      {/* Actions */}
      <div className="flex gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          aria-label="Print receipt"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          Print
        </button>
        <button
          type="button"
          onClick={handleDownload}
          aria-label="Download receipt"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function PayPage({ params }: { params: { paymentId: string } }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [pollWarning, setPollWarning] = useState<string>('');
  /** True when consecutive poll failures have crossed the degradation threshold. */
  const [networkDegraded, setNetworkDegraded] = useState(false);
  const pollNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let pollAttempts = 0;
    let consecutiveFailures = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    paymentsApi.getByReference(params.paymentId)
      .then(({ data }) => setPayment(data))
      .catch(() => {
        setLoadError(true);
        // Treat a failed initial load as a degraded network too — the customer
        // landing on the page sees nothing working, which is worse than polling
        // recovering after mount.
        setNetworkDegraded(true);
      })
      .finally(() => setLoading(false));

    const scheduleNext = () => {
      if (cancelled) return;
      const backoff = Math.min(
        POLL_INTERVAL_MS * 2 ** consecutiveFailures,
        POLL_MAX_BACKOFF_MS,
      );
      timeout = setTimeout(poll, backoff);
    };

    const poll = () => {
      if (cancelled) return;
      pollAttempts += 1;
      if (pollAttempts >= POLL_MAX_ATTEMPTS) {
        setPollWarning('Status checks are taking longer than expected.');
        return;
      }
      paymentsApi.getByReference(params.paymentId)
        .then(({ data }) => {
          consecutiveFailures = 0;
          setPollWarning('');
          // Recovery: clear the degradation banner once the network is back.
          setNetworkDegraded(false);
          setPayment(data);
          if (['settled', 'failed', 'expired'].includes(data.status)) return;
          scheduleNext();
        })
        .catch(() => {
          consecutiveFailures += 1;
          setPollWarning('We are having trouble checking your payment status right now.');
          if (consecutiveFailures >= DEGRADED_FAILURE_THRESHOLD) {
            setNetworkDegraded(true);
          }
          scheduleNext();
        });
    };

    // Expose an immediate poll trigger so visibilitychange can refresh
    // without waiting for the next scheduled interval tick.
    pollNowRef.current = () => {
      if (cancelled) return;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      poll();
    };

    scheduleNext();

    return () => {
      cancelled = true;
      pollNowRef.current = null;
      if (timeout) clearTimeout(timeout);
    };
  }, [params.paymentId]);

  const expiresAt = payment ? computeExpiresAt(payment) : null;
  const isPending = payment?.status === 'pending';
  const isSettled = payment?.status === 'settled' || payment?.status === 'completed';
  const remainingMs = expiresAt ? expiresAt.getTime() - now : 0;
  const isExpiredByClock = isPending && expiresAt ? remainingMs <= 0 : false;

  useEffect(() => {
    if (!isPending || !expiresAt) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [isPending, expiresAt]);

  // When the tab becomes visible again, background throttling may have left
  // `now` and the polled `payment` state out of sync. Recompute `now` and
  // trigger an immediate poll so the countdown matches the latest status.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(Date.now());
      pollNowRef.current?.();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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
          {networkDegraded ? (
            <>
              <p className="text-gray-700 font-semibold">Network connection issue</p>
              <p className="text-gray-500 text-sm mt-1">
                {loadError
                  ? 'We couldn\'t load this payment — the Stellar network or our backend may be temporarily down.'
                  : 'Payment not found'}
              </p>
            </>
          ) : (
            <p className="text-gray-600">
              {loadError ? 'Something went wrong loading this payment — try again' : 'Payment not found'}
            </p>
          )}
        </div>
      </div>
    );
  }

  const hasCryptoAmount = payment.amountXlm != null && payment.amountXlm > 0;
  const stellarUri = hasCryptoAmount
    ? `web+stellar:pay?destination=${encodeURIComponent(payment.stellarDepositAddress ?? '')}&amount=${encodeURIComponent(String(payment.amountXlm))}&memo=${encodeURIComponent(payment.stellarMemo)}&memo_type=text`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-[92vw] xs:max-w-sm">
        <div className="p-4 xs:p-6 border-b border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">DupDub</p>
          <h1 className="text-3xl font-bold mt-1">{formatUsd(payment.amountUsd)}</h1>
          {payment.description && (
            <p className="text-sm text-gray-500 mt-1 break-words">{payment.description}</p>
          )}
        </div>

        <div className="p-4 xs:p-6">
          {/* Network degradation banner — shown for any non-terminal status */}
          {!isSettled && payment.status !== 'failed' && payment.status !== 'expired' && (
            <DegradedBanner visible={networkDegraded} />
          )}

          {isSettled ? (
            <Receipt payment={payment} />
          ) : isPending ? (
            <>
              {expiresAt && (
                <div
                  className={`flex items-center justify-center gap-2 rounded-lg p-3 mb-4 text-sm font-semibold ${
                    isExpiredByClock || remainingMs < 60_000
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {isExpiredByClock ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {isExpiredByClock ? (
                    'This payment request has expired'
                  ) : (
                    <>Expires in {formatRemaining(remainingMs)}</>
                  )}
                </div>
              )}

              <div className="flex justify-center mb-4">
                {stellarUri ? (
                  <div
                    className="bg-white p-3 rounded-xl border border-gray-200"
                    role="img"
                    aria-label={`Stellar payment QR code for ${formatUsd(payment.amountUsd)}`}
                  >
                    <QRCodeSVG value={stellarUri} size={160} />
                  </div>
                ) : (
                  <div
                    data-testid="crypto-amount-pending"
                    className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-2 w-44 h-44"
                  >
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <p className="text-xs text-gray-500">Calculating crypto exchange rate…</p>
                  </div>
                )}
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
                  <code className="text-sm font-mono font-bold break-all flex-1 text-gray-900">
                    {payment.stellarDepositAddress}
                  </code>
                  <button
                    onClick={() => copy(payment.stellarDepositAddress ?? '', 'address')}
                    aria-label="Copy deposit address"
                    className="shrink-0"
                  >
                    {copied === 'address' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {payment.stellarMemo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-3">
                  <p className="text-xs text-gray-500 mb-1">Memo (required)</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold break-all flex-1 text-gray-900">{payment.stellarMemo}</code>
                    <button
                      onClick={() => copy(payment.stellarMemo, 'memo')}
                      aria-label={copied === 'memo' ? 'Memo copied' : 'Copy memo'}
                      className="shrink-0"
                    >
                      {copied === 'memo' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              {STATUS_ICONS[payment.status] ?? DEFAULT_STATUS_ICON}
              <p className="mt-3 text-sm font-medium text-gray-700 capitalize">{payment.status}</p>
              {pollWarning && <p className="mt-2 text-xs text-amber-600">{pollWarning}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
