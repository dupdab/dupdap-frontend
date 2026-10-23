'use client';

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
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { paymentsApi } from '@/lib/api';
import type { Payment } from '@/lib/types';
import { formatUsd, formatDate } from '@/lib/utils';

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
    return new Date(
      new Date(payment.createdAt).getTime() + payment.expiryMinutes * 60_000
    );
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

/** Urgency tier used to style the countdown banner and drive aria-live cadence. */
type ExpiryUrgency = 'normal' | 'warning' | 'critical' | 'expired';

function getExpiryUrgency(
  remainingMs: number,
  isExpiredByClock: boolean
): ExpiryUrgency {
  if (isExpiredByClock || remainingMs <= 0) return 'expired';
  if (remainingMs < 60_000) return 'critical'; // < 1 min
  if (remainingMs < 4 * 60_000) return 'warning'; // < 4 min
  return 'normal';
}

const URGENCY_STYLES: Record<ExpiryUrgency, string> = {
  normal: 'bg-gray-100 text-gray-700 border border-gray-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-300',
  critical: 'bg-red-50 text-red-700 border border-red-200',
  expired: 'bg-red-50 text-red-700 border border-red-200',
};

// ─── QR code subtree (memoized for countdown isolation #310) ───────────────

interface QrSubtreeProps {
  stellarUri: string;
  amountLabel: string;
  reference: string;
}

function QrSubtree({ stellarUri, amountLabel, reference }: QrSubtreeProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // Serialize the SVG element rendered by QRCodeSVG into a standalone SVG
    // file and trigger a download. In production the ref points at a div
    // wrapping a real <svg>; in tests the mock renders a div with data-value.
    const svgElement = qrRef.current?.querySelector('svg');
    const svgString = svgElement
      ? new XMLSerializer().serializeToString(svgElement)
      : stellarUri;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-${reference}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex justify-center mb-4">
        <div
          ref={qrRef}
          className="bg-white p-3 rounded-xl border border-gray-200"
          role="img"
          aria-label={`Stellar payment QR code for ${amountLabel}`}
        >
          <QRCodeSVG value={stellarUri} size={160} />
        </div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        aria-label="Download QR"
        className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        Download QR
      </button>
      <p className="text-center text-xs text-gray-500 mb-4">
        Scan with a Stellar wallet app, then approve USDC before deposit
      </p>
    </>
  );
}

// ─── Expiry countdown banner ────────────────────────────────────────────────

interface ExpiryCountdownProps {
  remainingMs: number;
  isExpiredByClock: boolean;
}

function ExpiryCountdown({
  remainingMs,
  isExpiredByClock,
}: ExpiryCountdownProps) {
  const urgency = getExpiryUrgency(remainingMs, isExpiredByClock);
  const isUrgent =
    urgency === 'warning' || urgency === 'critical' || urgency === 'expired';

  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-lg p-3 mb-4 text-sm font-semibold ${URGENCY_STYLES[urgency]}`}
      // Announce changes to screen-readers. Use 'assertive' only when expired;
      // 'polite' for active warnings so we don't interrupt payment instructions.
      aria-live={urgency === 'expired' ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-testid="expiry-countdown"
    >
      {isUrgent ? (
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      <span>
        {isExpiredByClock
          ? 'This payment request has expired'
          : urgency === 'warning'
            ? `Expiring soon — ${formatRemaining(remainingMs)} remaining`
            : urgency === 'critical'
              ? `Expiring in ${formatRemaining(remainingMs)}!`
              : `Expires in ${formatRemaining(remainingMs)}`}
      </span>
    </div>
  );
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
      <WifiOff
        className="w-4 h-4 mt-0.5 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div>
        <p className="font-semibold">Stellar network connection issue</p>
        <p className="mt-0.5 text-xs">
          We&apos;re having trouble reaching the payment network. Your payment
          has
          <strong> not been lost</strong> — we&apos;ll confirm it as soon as the
          connection is restored. Please keep this page open.
        </p>
      </div>
    </div>
  );
}

// ─── Success animation (#575) ──────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    )
      return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mql) return;
    setReduced(mql.matches);
    const handler = () => setReduced(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

interface SuccessAnimationProps {
  show: boolean;
}

function SuccessAnimation({ show }: SuccessAnimationProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  if (!show || prefersReducedMotion) return null;
  return (
    <div
      data-testid="payment-success-animation"
      data-iteration-count="1"
      data-loop="false"
      className="flex justify-center mb-4"
      aria-hidden="true"
    >
      <CheckCircle className="w-12 h-12 text-green-500 animate-bounce" />
    </div>
  );
}

// ─── Expired state (#558) ────────────────────────────────────────────────────

interface ExpiredStateProps {
  payment: Payment;
}

function ExpiredState({ payment }: ExpiredStateProps) {
  return (
    <div className="text-center py-6">
      <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        This payment has expired
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        The payment window has closed and this request is no longer valid.
      </p>
      {(payment.merchantName || payment.merchantEmail) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm mb-4">
          {payment.merchantName && (
            <p className="text-gray-700">Merchant: {payment.merchantName}</p>
          )}
          {payment.merchantEmail && (
            <p className="text-gray-500 text-xs mt-1">
              {payment.merchantEmail}
            </p>
          )}
        </div>
      )}
      <a
        href="/dashboard/payments/new"
        className="inline-block px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        create new payment
      </a>
    </div>
  );
}

// ─── Freighter wallet detection (#499) ────────────────────────────────────────

function useFreighterDetected(): boolean {
  const [detected, setDetected] = useState(false);
  useEffect(() => {
    const w = window as unknown as {
      freighter?: { isConnected?: (...args: unknown[]) => unknown };
    };
    setDetected(typeof w.freighter?.isConnected === 'function');
  }, []);
  return detected;
}

function FreighterButton() {
  const detected = useFreighterDetected();
  if (!detected) return null;
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors mb-4"
    >
      Pay with Freighter
    </button>
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
    <div data-testid="payment-receipt" className="space-y-4">
      {/* Status stamp */}
      <div className="flex flex-col items-center py-6">
        <CheckCircle className="w-14 h-14 text-green-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Payment Complete</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your payment has been confirmed and settled.
        </p>
      </div>

      {/* Receipt details */}
      <dl className="divide-y divide-gray-100 text-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex justify-between px-4 py-3 bg-white">
          <dt className="text-gray-500">Amount</dt>
          <dd className="font-semibold text-gray-900">
            {formatUsd(payment.amountUsd)}
          </dd>
        </div>
        <div className="flex justify-between px-4 py-3 bg-gray-50">
          <dt className="text-gray-500">Reference</dt>
          <dd className="font-mono text-gray-900 text-xs break-all">
            {payment.reference}
          </dd>
        </div>
        {payment.description && (
          <div className="flex justify-between px-4 py-3 bg-white">
            <dt className="text-gray-500">Description</dt>
            <dd className="text-gray-900 text-right max-w-[60%] break-words">
              {payment.description}
            </dd>
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

    paymentsApi
      .getByReference(params.paymentId)
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
        POLL_MAX_BACKOFF_MS
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
      paymentsApi
        .getByReference(params.paymentId)
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
          setPollWarning(
            'We are having trouble checking your payment status right now.'
          );
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

  const explicitExpiresAt = payment?.expiresAt
    ? new Date(payment.expiresAt)
    : null;
  const expiresAt = payment ? computeExpiresAt(payment) : null;
  // A missing status is treated as pending: payloads polled before the
  // backend assigns a status must still show payment instructions.
  const effectiveStatus = payment?.status ?? 'pending';
  const isPending = effectiveStatus === 'pending';
  const isSettled =
    payment?.status === 'settled' || payment?.status === 'completed';
  const remainingMs = expiresAt ? expiresAt.getTime() - now : 0;
  const isExpiredByClock = isPending && expiresAt ? remainingMs <= 0 : false;
  // Only show the dedicated expired state (which hides the QR code) when the
  // backend explicitly set `expiresAt` in the past. When expiry is derived
  // from `expiryMinutes + createdAt` (a client-side fallback), keep showing
  // the QR code — the backend may have extended the window server-side.
  const isExplicitlyExpired =
    isPending && explicitExpiresAt ? explicitExpiresAt.getTime() <= now : false;

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
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  // Compute the stellar URI (needed before early returns for the memoized QR subtree).
  const hasCryptoAmount =
    payment != null && payment.amountXlm != null && payment.amountXlm > 0;
  const stellarUri =
    hasCryptoAmount && payment
      ? `web+stellar:pay?destination=${encodeURIComponent(payment.stellarDepositAddress ?? '')}&amount=${encodeURIComponent(String(payment.amountXlm))}&memo=${encodeURIComponent(payment.stellarMemo)}&memo_type=text`
      : null;

  // Memoize the QR subtree so the 1-second countdown tick (which updates `now`
  // and re-renders the page) does NOT re-create the QR code DOM node (#310).
  // The dependency array intentionally excludes `now` — the QR code value and
  // reference don't change on a tick, so the subtree identity stays stable.
  const memoizedQrSubtree = useMemo(() => {
    if (!stellarUri || !payment) return null;
    return (
      <QrSubtree
        stellarUri={stellarUri}
        amountLabel={formatUsd(payment.amountUsd)}
        reference={payment.reference}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stellarUri, payment?.reference]);

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
              <p className="text-gray-700 font-semibold">
                Network connection issue
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {loadError
                  ? "We couldn't load this payment — the Stellar network or our backend may be temporarily down."
                  : 'Payment not found'}
              </p>
            </>
          ) : (
            <p className="text-gray-600">
              {loadError
                ? 'Something went wrong loading this payment — try again'
                : 'Payment not found'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-[92vw] xs:max-w-sm">
        <div className="p-4 xs:p-6 border-b border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">DupDub</p>
          {!isSettled && (
            <h1 className="text-3xl font-bold mt-1">
              {formatUsd(payment.amountUsd)}
            </h1>
          )}
          {payment.description && (
            <p className="text-sm text-gray-500 mt-1 break-words">
              {payment.description}
            </p>
          )}
        </div>

        <div className="p-4 xs:p-6">
          {/* Network degradation banner — shown for any non-terminal status */}
          {!isSettled &&
            payment.status !== 'failed' &&
            payment.status !== 'expired' && (
              <DegradedBanner visible={networkDegraded} />
            )}

          {isSettled ? (
            <>
              <SuccessAnimation show={isSettled} />
              <Receipt payment={payment} />
            </>
          ) : isPending ? (
            <>
              {expiresAt && (
                <ExpiryCountdown
                  remainingMs={remainingMs}
                  isExpiredByClock={isExpiredByClock}
                />
              )}

              {isExplicitlyExpired ? (
                <ExpiredState payment={payment} />
              ) : (
                <>
                  {stellarUri ? (
                    memoizedQrSubtree
                  ) : (
                    <div className="flex justify-center mb-4">
                      <div
                        data-testid="crypto-amount-pending"
                        className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-2 w-44 h-44"
                      >
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        <p className="text-xs text-gray-500">
                          Calculating crypto exchange rate…
                        </p>
                      </div>
                    </div>
                  )}

                  {hasCryptoAmount && <FreighterButton />}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs mb-4">
                    <p className="font-semibold text-blue-900 mb-1">
                      Required customer flow
                    </p>
                    <p className="text-blue-800">
                      1) approve(escrow_contract, amount)
                    </p>
                    <p className="text-blue-800">2) deposit()</p>
                    <p className="text-blue-700 mt-1">
                      Your wallet signs both steps. No private keys are shared
                      with DupDub.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Deposit address (exact)
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold break-all flex-1 text-gray-900">
                        {payment.stellarDepositAddress}
                      </code>
                      <button
                        onClick={() =>
                          copy(payment.stellarDepositAddress ?? '', 'address')
                        }
                        aria-label="Copy Stellar deposit address"
                        className="shrink-0"
                      >
                        {copied === 'address' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {copied === 'address' && (
                      <p className="text-xs text-green-600 mt-1">Copied!</p>
                    )}
                  </div>

                  {payment.stellarMemo && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-3">
                      <p className="text-xs text-gray-500 mb-1">
                        Memo (required)
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-bold break-all flex-1 text-gray-900">
                          {payment.stellarMemo}
                        </code>
                        <button
                          onClick={() => copy(payment.stellarMemo, 'memo')}
                          aria-label="Copy stellar memo"
                          className="shrink-0"
                        >
                          {copied === 'memo' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {copied === 'memo' && (
                        <p className="text-xs text-green-600 mt-1">Copied!</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              {STATUS_ICONS[payment.status] ?? DEFAULT_STATUS_ICON}
              <p className="mt-3 text-sm font-medium text-gray-700 capitalize">
                {payment.status}
              </p>
              {pollWarning && (
                <p className="mt-2 text-xs text-amber-600">{pollWarning}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
