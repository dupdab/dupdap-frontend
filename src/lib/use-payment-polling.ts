'use client';

import { useEffect, useRef, useState } from 'react';

import { paymentsApi } from './api';

import type { Payment } from './types';

/**
 * Polling configuration constants.
 *
 * These are exported so tests can assert against the same values and so
 * future consumers (e.g. a WebSocket adapter) can reference them when
 * deciding whether to fall back to polling.
 */
export const POLL_INTERVAL_MS = 3000;
export const POLL_BACKOFF_AFTER_ATTEMPTS = 10;
export const POLL_SLOW_INTERVAL_MS = 10_000;
export const POLL_SLOWEST_AFTER_ATTEMPTS = 20;
export const POLL_SLOWEST_INTERVAL_MS = 30_000;
export const POLL_TIMEOUT_MS = 15 * 60_000;

/**
 * Number of consecutive poll failures before we show the network degradation
 * banner. Two failures correspond to roughly 10 s of silence — enough to
 * distinguish a transient hiccup from a real outage without alarming customers
 * on a normal 5-s retry bounce.
 */
export const DEGRADED_FAILURE_THRESHOLD = 2;

/** Payment statuses that should stop the polling loop. */
const TERMINAL_STATUSES = ['settled', 'failed', 'expired'];

export interface UsePaymentPollingOptions {
  /**
   * Called when the tab becomes visible again (visibilitychange → visible).
   * The hook already triggers an immediate poll in that case; this callback
   * lets the consumer recompute time-derived UI (e.g. a countdown clock)
   * without installing its own listener.
   */
  onTabVisible?: () => void;
}

export interface UsePaymentPollingResult {
  /** The latest payment data, or null before the initial fetch resolves. */
  payment: Payment | null;
  /** True while the initial fetch is in flight. */
  loading: boolean;
  /** True when the initial fetch rejected — the payment could not be loaded. */
  loadError: boolean;
  /** Human-readable warning shown when polling takes longer than expected. */
  pollWarning: string;
  /** True when consecutive poll failures have crossed the degradation threshold. */
  networkDegraded: boolean;
  /** True once polling stopped because it exceeded `POLL_TIMEOUT_MS`. */
  pollTimedOut: boolean;
}

/**
 * Reusable hook that polls a payment's status by reference.
 *
 * Encapsulates the polling logic that was previously inline in
 * `/pay/[paymentId]/page.tsx`: initial fetch → exponential-backoff polling
 * → stop on terminal status → network-degradation detection →
 * visibility-change immediate refresh.
 *
 * The hook is intentionally transport-agnostic. Swapping the polling for a
 * WebSocket subscription later only requires changing the internals of this
 * hook; consumers are unaffected.
 *
 * @param paymentId - The payment reference to poll.
 * @param options   - Optional callbacks.
 */
export function usePaymentPolling(
  paymentId: string,
  options?: UsePaymentPollingOptions
): UsePaymentPollingResult {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pollWarning, setPollWarning] = useState('');
  const [networkDegraded, setNetworkDegraded] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  // Keep the latest onTabVisible in a ref so the visibilitychange effect
  // doesn't need to re-subscribe whenever the callback identity changes.
  const onTabVisibleRef = useRef(options?.onTabVisible);
  onTabVisibleRef.current = options?.onTabVisible;

  // Expose an immediate poll trigger so visibilitychange can refresh
  // without waiting for the next scheduled interval tick.
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
      setPollWarning(
        'We stopped checking automatically after 15 minutes. Refresh the page to check again.'
      );
    };

    paymentsApi
      .getByReference(paymentId)
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
      if (cancelled || stopped) return;
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        handleTimeout();
        return;
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
      pollAttempts += 1;
      paymentsApi
        .getByReference(paymentId)
        .then(({ data }) => {
          consecutiveFailures = 0;
          setPollWarning('');
          // Recovery: clear the degradation banner once the network is back.
          setNetworkDegraded(false);
          setPayment(data);
          if (TERMINAL_STATUSES.includes(data.status)) {
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

  // When the tab becomes visible again, background throttling may have left
  // the polled `payment` state stale. Trigger an immediate poll so the status
  // matches the latest backend state. Also let the consumer recompute any
  // time-derived UI (e.g. countdown clock) via the onTabVisible callback.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      onTabVisibleRef.current?.();
      pollNowRef.current?.();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    payment,
    loading,
    loadError,
    pollWarning,
    networkDegraded,
    pollTimedOut,
  };
}
