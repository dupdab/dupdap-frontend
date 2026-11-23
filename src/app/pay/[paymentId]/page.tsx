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
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { paymentsApi } from '@/lib/api';
import { isRateStale } from '@/lib/stale-rate';
import type { Payment } from '@/lib/types';
import {
  formatUsdWithCode,
  formatXlmEquivalent,
  formatDate,
} from '@/lib/utils';

import { ErrorBoundary } from '@/components/ErrorBoundary';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-8 h-8 text-yellow-500" />,
  confirmed: <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />,
  settling: <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />,
  settled: <CheckCircle className="w-8 h-8 text-green-500" />,
  failed: <XCircle className="w-8 h-8 text-red-500" />,
  expired: <XCircle className="w-8 h-8 text-gray-400" />,
};

const DEFAULT_STATUS_ICON = <Clock className="w-8 h-8 text-gray-400" />;

/** Initial polling cadence: one status check every 3 s. */
const POLL_INTERVAL_MS = 3000;
/** After this many attempts the cadence backs off to `POLL_SLOW_INTERVAL_MS`. */
const POLL_BACKOFF_AFTER_ATTEMPTS = 10;
/** Cadence once the first backoff tier is reached. */
const POLL_SLOW_INTERVAL_MS = 10_000;
/** Cadence once the second backoff tier is reached. */
const POLL_SLOWEST_INTERVAL_MS = 30_000;
/** Attempt count at which the cadence drops to `POLL_SLOWEST_INTERVAL_MS`. */
const POLL_SLOWEST_AFTER_ATTEMPTS = 20;
/** Hard stop: polling gives up after 15 minutes and shows the timeout state. */
const POLL_TIMEOUT_MS = 15 * 60_000;
/** After this long without a terminal status we warn the customer (#770). */
const SLOW_PAYMENT_WARNING_MS = 5 * 60_000;

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

const STELLAR_URI_PREFIX = 'web+stellar:pay?';

/**
 * A malformed `stellarUri` makes `qrcode.react` throw while rendering, so the
 * value is validated before it ever reaches the QR renderer (#771).
 */
export function isValidStellarUri(uri: string | null | undefined): boolean {
  return typeof uri === 'string' && uri.startsWith(STELLAR_URI_PREFIX);
}

interface QrSubtreeProps {
  stellarUri: string;
  amountLabel: string;
  reference: string;
  depositAddress: string;
  amountXlm: number;
}

function QrSubtree({
  stellarUri,
  amountLabel,
  reference,
  depositAddress,
  amountXlm,
}: QrSubtreeProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isValidStellarUri(stellarUri)) {
    return (
      <div className="flex justify-center mb-4">
        <div
          data-testid="stellar-uri-invalid"
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 w-44 h-44"
        >
          <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
          <p className="text-xs text-red-700">
            This payment link is invalid. Please contact the merchant for a new
            payment request.
          </p>
        </div>
      </div>
    );
  }

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
          aria-label="Stellar payment QR code — scan with your wallet app"
        >
          <QRCodeSVG value={stellarUri} size={160} aria-hidden="true" />
        </div>
      </div>
      <p className="text-center text-xs text-gray-600 mb-4 break-words">
        <span className="sr-only">
          Stellar payment QR code — scan with your wallet app. Deposit address:{' '}
        </span>
        <span className="font-mono">{depositAddress}</span>
        <span className="sr-only">, amount: </span>
        <span className="font-semibold">
          {amountXlm} XLM ({amountLabel})
        </span>
      </p>
      <p className="sr-only" data-testid="qr-text-alternative">
        Deposit address {depositAddress}, amount {amountXlm} XLM ({amountLabel})
      </p>
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
      {/* Mobile-only tap-to-open deep link; desktop users scan the QR instead. */}
      <a
        href={stellarUri}
        className="sm:hidden flex items-center justify-center gap-2 w-full px-4 py-2 mb-4 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors"
      >
        Open in Wallet
      </a>
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

// ─── Stale rate banner (#772) ──────────────────────────────────────────────

interface StaleRateBannerProps {
  visible: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

function StaleRateBanner({
  visible,
  refreshing,
  onRefresh,
}: StaleRateBannerProps) {
  if (!visible) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="stale-rate-banner"
      className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-300 p-3 mb-4 text-sm text-amber-800"
    >
      <AlertTriangle
        className="w-4 h-4 mt-0.5 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="font-semibold">
          Rate updated — please review new amount
        </p>
        <p className="mt-0.5 text-xs">
          The XLM exchange rate moved since this payment was created. Refresh to
          see the current amount before sending funds.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh payment details"
          className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-medium text-amber-900 bg-white hover:bg-amber-100 transition-colors disabled:opacity-60"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
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
        Start a new payment
      </a>
    </div>
  );
}

// ─── Slow payment / timeout state (#770) ─────────────────────────────────────

interface SlowPaymentStateProps {
  payment: Payment;
}

function SlowPaymentState({ payment }: SlowPaymentStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="payment-slow"
      className="text-center py-6"
    >
      <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Payment is taking longer than expected
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        We&apos;re still checking the status of this payment. Your funds have
        not been lost — you can keep this page open or start a new payment.
      </p>
      <a
        href="/dashboard/payments/new"
        className="inline-block px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        Start a new payment
      </a>
      {payment.reference && (
        <p className="mt-3 text-xs text-gray-400">
          Reference: {payment.reference}
        </p>
      )}
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
      `Amount:      ${formatUsdWithCode(payment.amountUsd)}`,
      payment.amountXlm != null && payment.amountXlm > 0
        ? `XLM:         ${formatXlmEquivalent(payment.amountXlm)}`
        : '',
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
        <p className="hidden text-sm font-medium text-gray-600 print:block">
          {payment.merchantName || 'DupDub'}
        </p>
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
            {formatUsdWithCode(payment.amountUsd)}
            {payment.amountXlm != null && payment.amountXlm > 0 && (
              <span className="block text-xs font-normal text-gray-500">
                {formatXlmEquivalent(payment.amountXlm)}
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between px-4 py-3 bg-gray-50">
          <dt className="text-gray-500">Status</dt>
          <dd className="font-medium text-gray-900">{payment.status}</dd>
        </div>
        <div className="flex justify-between px-4 py-3 bg-white">
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
        {(payment.transactionHash || payment.txHash) && (
          <div className="flex justify-between px-4 py-3 bg-white">
            <dt className="text-gray-500">Transaction</dt>
            <dd className="font-mono text-gray-900 text-xs break-all text-right max-w-[60%]">
              {payment.transactionHash || payment.txHash}
            </dd>
          </div>
        )}
      </dl>

      {/* Permanent receipt link (#774) */}
      <p className="text-center text-sm print:hidden">
        <Link
          href={`/pay/${encodeURIComponent(payment.reference || payment.id)}/receipt`}
          className="text-brand-700 hover:underline font-medium"
        >
          View printable receipt
        </Link>
      </p>

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
  return (
    <ErrorBoundary
      context={{ paymentId: params.paymentId }}
      fallback={(reset) => <PayPageErrorFallback onRetry={reset} />}
    >
      <PayPageContent paymentId={params.paymentId} />
    </ErrorBoundary>
  );
}

function PayPageErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-[92vw] xs:max-w-sm p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h1 className="text-xl font-bold mt-3">Something went wrong</h1>
        <p className="text-sm text-gray-600 mt-2">
          We couldn&apos;t display this payment. Your funds are safe — please try
          again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function PayPageContent({ paymentId }: { paymentId: string }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  /** Screen-reader announcement for the most recent copy attempt. */
  const [copyAnnouncement, setCopyAnnouncement] = useState<string>('');
  const [pollWarning, setPollWarning] = useState<string>('');
  /** True when consecutive poll failures have crossed the degradation threshold. */
  const [networkDegraded, setNetworkDegraded] = useState(false);
  /** True once polling has been running for `POLL_TIMEOUT_MS` without a terminal status. */
  const [pollTimedOut, setPollTimedOut] = useState(false);
  /** True once polling has run for `SLOW_PAYMENT_WARNING_MS` without a terminal status. */
  const [slowPayment, setSlowPayment] = useState(false);
  /** Payment snapshot captured at creation, used to detect XLM rate drift. */
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let pollAttempts = 0;
    let consecutiveFailures = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let stopped = false;
    const startedAt = Date.now();

    const stopPolling = () => {
      stopped = true;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };

    const handleTimeout = () => {
      stopPolling();
      setPollTimedOut(true);
      setSlowPayment(true);
      setPollWarning(
        'We stopped checking automatically after 15 minutes. Refresh the page to check again.'
      );
    };

    paymentsApi
      .getByReference(params.paymentId)
      .then(({ data }) => {
        setPayment(data);
        setCreatedPayment(data);
      })
      .catch(() => {
        setLoadError(true);
        // Treat a failed initial load as a degraded network too — the customer
        // landing on the page sees nothing working, which is worse than polling
        // recovering after mount.
        setNetworkDegraded(true);
      })
      .finally(() => setLoading(false));

    const scheduleNext = () => {
      if (cancelled || stopped) return;
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        handleTimeout();
        return;
      }
      if (Date.now() - startedAt >= SLOW_PAYMENT_WARNING_MS) {
        setSlowPayment(true);
      }
      const interval =
        pollAttempts >= POLL_SLOWEST_AFTER_ATTEMPTS
          ? POLL_SLOWEST_INTERVAL_MS
          : pollAttempts >= POLL_BACKOFF_AFTER_ATTEMPTS
            ? POLL_SLOW_INTERVAL_MS
            : POLL_INTERVAL_MS;
      timeout = setTimeout(poll, interval);
    };

    const poll = () => {
      if (cancelled || stopped) return;
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        handleTimeout();
        return;
      }
      if (Date.now() - startedAt >= SLOW_PAYMENT_WARNING_MS) {
        setSlowPayment(true);
      }
      pollAttempts += 1;
      paymentsApi
        .getByReference(paymentId)
        .then(({ data }) => {
          consecutiveFailures = 0;
          setPollWarning('');
          // Recovery: clear the degradation banner once the network is back.
          setNetworkDegraded(false);
          setPayment(data);
          if (['settled', 'failed', 'expired'].includes(data.status)) {
            stopPolling();
            return;
          }
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
      if (cancelled || stopped) return;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      poll();
    };

    scheduleNext();

    return () => {
      cancelled = true;
      stopped = true;
      pollNowRef.current = null;
      if (timeout) clearTimeout(timeout);
    };
  }, [paymentId]);

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
  // The backend is the source of truth for expiry (#770).
  const isBackendExpired = payment?.status === 'expired';
  const isExpired = isBackendExpired || isExplicitlyExpired;

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
    const label = key === 'address' ? 'Deposit address' : 'Memo';
    if (!text) {
      setCopyAnnouncement(`${label} is unavailable to copy.`);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyAnnouncement(
        `Copying is not supported in this browser. Please select the ${label.toLowerCase()} and copy it manually.`
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setCopyAnnouncement(`${label} copied to clipboard.`);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      setCopyAnnouncement(
        `Could not copy the ${label.toLowerCase()}. Please select it and copy manually.`
      );
    }
  };

  /** Re-fetch the latest payment details (e.g. after the XLM rate moved). */
  const refreshPayment = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await paymentsApi.getByReference(params.paymentId);
      setPayment(data);
      setNetworkDegraded(false);
    } catch {
      setNetworkDegraded(true);
    } finally {
      setRefreshing(false);
    }
  }, [params.paymentId]);

  const rateStale = isRateStale(createdPayment, payment);

  // Compute the stellar URI (needed before early returns for the memoized QR subtree).
  const hasCryptoAmount =
    payment != null && payment.amountXlm != null && payment.amountXlm > 0;
  const stellarUri =
    hasCryptoAmount && payment
      ? `web+stellar:pay?destination=${encodeURIComponent(payment.stellarDepositAddress ?? '')}&amount=${encodeURIComponent(String(payment.amountXlm))}&memo=${encodeURIComponent(payment.stellarMemo)}&memo_type=text`
      : null;
  const hasValidStellarUri = isValidStellarUri(stellarUri);

  // Memoize the QR subtree so the 1-second countdown tick (which updates `now`
  // and re-renders the page) does NOT re-create the QR code DOM node (#310).
  // The dependency array intentionally excludes `now` — the QR code value and
  // reference don't change on a tick, so the subtree identity stays stable.
  const memoizedQrSubtree = useMemo(() => {
    if (!isValidStellarUri(stellarUri) || !payment) return null;
    return (
      <QrSubtree
        stellarUri={stellarUri}
        amountLabel={formatUsdWithCode(payment.amountUsd)}
        reference={payment.reference}
        depositAddress={payment.stellarDepositAddress ?? ''}
        amountXlm={payment.amountXlm ?? 0}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stellarUri, payment?.reference, payment?.amountXlm]);

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
              {formatUsdWithCode(payment.amountUsd)}
            </h1>
          )}
          {!isSettled && hasCryptoAmount && payment.amountXlm != null && (
            <p
              data-testid="xlm-equivalent"
              className="text-sm text-gray-600 mt-1"
            >
              {formatXlmEquivalent(payment.amountXlm)}
            </p>
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

          {isPending && (
            <StaleRateBanner
              visible={rateStale}
              refreshing={refreshing}
              onRefresh={refreshPayment}
            />
          )}

          {isSettled ? (
            <>
              <SuccessAnimation show={isSettled} />
              <Receipt payment={payment} />
            </>
          ) : isExpired ? (
            <ExpiredState payment={payment} />
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
              ) : slowPayment ? (
                <SlowPaymentState payment={payment} />
              ) : (
                <>
                  {hasValidStellarUri ? (
                    memoizedQrSubtree
                  ) : hasCryptoAmount ? (
                    <div className="flex justify-center mb-4">
                      <div
                        data-testid="stellar-uri-invalid"
                        role="alert"
                        className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 w-44 h-44"
                      >
                        <AlertTriangle
                          className="w-8 h-8 text-red-500"
                          aria-hidden="true"
                        />
                        <p className="text-xs text-red-700">
                          This payment link is invalid. Please contact the
                          merchant for a new payment request.
                        </p>
                      </div>
                    </div>
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
                    <span className="sr-only" role="status" aria-live="polite">
                      {copyAnnouncement}
                    </span>
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
              {pollTimedOut && (
                <p
                  role="status"
                  data-testid="poll-timeout"
                  className="mt-2 text-xs text-gray-500"
                >
                  Automatic status checks have stopped. Refresh the page to
                  check again.
                </p>
              )}
              <a
                href="/dashboard/payments/new"
                className="inline-block mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                Start a new payment
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
