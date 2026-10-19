'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, CheckCircle, XCircle, Loader2, Copy, Check, AlertTriangle, Wallet, ExternalLink } from 'lucide-react';
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

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 24;
const POLL_MAX_BACKOFF_MS = 60_000;

const STELLAR_NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

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

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function PayPage({ params }: { params: { paymentId: string } }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [pollWarning, setPollWarning] = useState<string>('');
  const [freighterAvailable, setFreighterAvailable] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const pollNowRef = useRef<(() => void) | null>(null);

  // Detect the Freighter browser extension. Freighter injects
  // `window.freighterApi` when the extension is present.
  useEffect(() => {
    const detect = () => {
      const api = (window as any).freighterApi;
      if (api && typeof api.requestAccess === 'function') {
        setFreighterAvailable(true);
        return;
      }
      setFreighterAvailable(false);
    };
    detect();
    // The extension may inject after hydration; re-check shortly after mount.
    const t = setTimeout(detect, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let pollAttempts = 0;
    let consecutiveFailures = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    paymentsApi.getByReference(params.paymentId)
      .then(({ data }) => setPayment(data))
      .catch(() => setLoadError(true))
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
          setPayment(data);
          if (['settled', 'failed', 'expired'].includes(data.status)) return;
          scheduleNext();
        })
        .catch(() => {
          consecutiveFailures += 1;
          setPollWarning('We are having trouble checking your payment status right now.');
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

  const payWithFreighter = async () => {
    if (!payment) return;
    const api = (window as any).freighterApi;
    if (!api) {
      setPayError('Freighter wallet not detected.');
      return;
    }
    setPayError('');
    setTxHash('');
    setPaying(true);
    try {
      const access = await api.requestAccess();
      if (access?.error) throw new Error(access.error);
      const publicKey: string = access?.publicKey ?? (await api.getPublicKey());
      if (!publicKey) throw new Error('Could not read wallet public key.');

      const destination = payment.stellarDepositAddress ?? '';
      const amount = String(payment.amountXlm ?? '');
      const memo = payment.stellarMemo ?? '';

      // Build the approve + deposit transaction XDR. The backend exposes a
      // helper that returns an unsigned XDR for the customer to sign.
      const { data: built } = await paymentsApi.buildDepositTransaction(params.paymentId, {
        sourceAccount: publicKey,
        destination,
        amount,
        memo,
      });
      const xdr: string = built?.xdr ?? built?.transactionXdr;
      if (!xdr) throw new Error('Could not build the payment transaction.');

      const signed = await api.signTransaction(xdr, {
        networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
      });
      if (signed?.error) throw new Error(signed.error);
      const signedXdr: string = signed?.signedXDR ?? signed?.signedTxXdr ?? signed;
      if (!signedXdr) throw new Error('Transaction signing was cancelled.');

      const { data: submitted } = await paymentsApi.submitTransaction(params.paymentId, {
        signedXdr,
      });
      const hash: string = submitted?.hash ?? submitted?.txHash ?? '';
      if (hash) setTxHash(hash);
      pollNowRef.current?.();
    } catch (err: any) {
      setPayError(err?.message ?? 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
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

  const hasCryptoAmount = payment.amountXlm != null && payment.amountXlm > 0;
  const stellarUri = hasCryptoAmount
    ? `web+stellar:pay?destination=${encodeURIComponent(payment.stellarDepositAddress ?? '')}&amount=${encodeURIComponent(String(payment.amountXlm))}&memo=${encodeURIComponent(payment.stellarMemo)}&memo_type=text`
    : null;
  const mobile = isMobileDevice();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-[92vw] xs:max-w-sm">
        <div className="p-4 xs:p-6 border-b border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">DupDub</p>
          <h1 className="text-3xl font-bold mt-1">{formatUsd(payment.amountUsd)}</h1>
          {payment.description && <p className="text-sm text-gray-500 mt-1 break-words">{payment.description}</p>}
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

              {txHash && (
                <div className="rounded-lg p-3 mb-4 text-sm bg-green-50 text-green-800 border border-green-200 break-all">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <CheckCircle className="w-4 h-4" /> Payment submitted
                  </div>
                  <p className="font-mono text-xs">{txHash}</p>
                  <button
                    type="button"
                    onClick={() => copy(txHash, 'txhash')}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
                  >
                    {copied === 'txhash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'txhash' ? 'Copied' : 'Copy transaction hash'}
                  </button>
                </div>
              )}

              {payError && (
                <div className="rounded-lg p-3 mb-4 text-sm bg-red-50 text-red-700 border border-red-200">
                  {payError}
                </div>
              )}

              {freighterAvailable && hasCryptoAmount && !isExpiredByClock && (
                <button
                  type="button"
                  onClick={payWithFreighter}
                  disabled={paying}
                  className="btn-primary w-full mb-4 inline-flex items-center justify-center gap-2"
                >
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  {paying ? 'Waiting for wallet…' : 'Pay with Freighter'}
                </button>
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
                    <p className="text-xs text-gray-500">Preparing payment details…</p>
                  </div>
                )}
              </div>

              {!freighterAvailable && stellarUri && (
                <p className="text-xs text-gray-500 text-center mb-4">
                  Freighter not detected — scan the QR code with your Stellar wallet.
                </p>
              )}

              {mobile && stellarUri && (
                <div className="flex flex-col gap-2 mb-4">
                  <a
                    href={`lobstr://pay?uri=${encodeURIComponent(stellarUri)}`}
                    className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in Lobstr
                  </a>
                  <a
                    href={`solarwallet://pay?uri=${encodeURIComponent(stellarUri)}`}
                    className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in Solar
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="flex justify-center mb-3">
                {STATUS_ICONS[payment.status] ?? DEFAULT_STATUS_ICON}
              </div>
              <p className="text-sm text-gray-600 capitalize">{payment.status}</p>
              {pollWarning && <p className="text-xs text-gray-400 mt-2">{pollWarning}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
