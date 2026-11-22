'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getWsUrl } from './env';
import toast from './toast';
import type { Payment, PaymentListResponse } from './types';

/** Shape of a real-time payment event pushed by the backend (#795). */
export interface PaymentEvent {
  type: string;
  payment?: Partial<Payment> & { id: string };
}

const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Applies a confirmed payment to a cached payments list in place. Exported
 * for testing.
 */
export function applyConfirmedPayment(
  list: PaymentListResponse | undefined,
  payment: Partial<Payment> & { id: string }
): PaymentListResponse | undefined {
  if (!list?.payments) return list;
  let changed = false;
  const payments = list.payments.map((p) => {
    if (p.id !== payment.id) return p;
    changed = true;
    return { ...p, ...payment, status: 'confirmed' as const };
  });
  return changed ? { ...list, payments } : list;
}

/**
 * Connects to the backend WebSocket while mounted and keeps cached payment
 * lists up to date when `payment.confirmed` events arrive (#795).
 * Reconnects with exponential backoff if the connection drops.
 */
export function usePaymentEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let disposed = false;

    const handleMessage = (event: MessageEvent) => {
      let data: PaymentEvent;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (data?.type !== 'payment.confirmed' || !data.payment?.id) return;

      const payment = data.payment;
      queryClient.setQueriesData<{ data: PaymentListResponse }>(
        { queryKey: ['payments', 'list'] },
        (old) => {
          if (!old) return old;
          const next = applyConfirmedPayment(old.data, payment);
          return next === old.data ? old : { ...old, data: next! };
        }
      );
      // Totals depend on the new status; refresh them from the API.
      void queryClient.invalidateQueries({ queryKey: ['payments', 'stats'] });

      toast.success(
        payment.reference
          ? `Payment ${payment.reference} confirmed`
          : 'Payment confirmed'
      );
    };

    const connect = () => {
      if (disposed) return;
      try {
        socket = new WebSocket(getWsUrl());
      } catch {
        scheduleReconnect();
        return;
      }
      socket.onopen = () => {
        attempts = 0;
      };
      socket.onmessage = handleMessage;
      socket.onclose = () => {
        socket = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(1000 * 2 ** attempts, MAX_RECONNECT_DELAY_MS);
      attempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [queryClient]);
}
