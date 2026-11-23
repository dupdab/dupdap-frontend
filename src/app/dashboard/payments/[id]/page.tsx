'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { getErrorMessage } from '@/lib/errors';
import type { Payment, WebhookDelivery } from '@/lib/types';
import {
  formatDate,
  formatUsd,
  STATUS_COLORS,
  STATUS_ICONS,
  DEFAULT_STATUS_COLOR,
} from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Ordered lifecycle used to render the status timeline (#782). */
const TIMELINE_STEPS = [
  'pending',
  'confirmed',
  'settling',
  'settled',
  'completed',
] as const;

function statusIndex(status: string): number {
  const normalized = status.toLowerCase();
  const index = TIMELINE_STEPS.indexOf(
    normalized as (typeof TIMELINE_STEPS)[number]
  );
  return index === -1 ? 0 : index;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="break-words font-medium">{value ?? '—'}</div>
    </div>
  );
}

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const paymentId = params?.id;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load payment (${res.status})`);
      setPayment(await res.json());
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Failed to load payment');
    } finally {
      setLoading(false);
    }

    // Webhook deliveries are supplementary: a failure must not hide the payment.
    try {
      const res = await fetch(
        `${API_BASE}/payments/${paymentId}/webhooks`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries ?? []);
      }
    } catch {
      setDeliveries([]);
    }
  }, [paymentId]);

  useEffect(() => {
    load();
  }, [load]);

  const backLink = (
    <Link
      href="/dashboard/payments"
      className="text-sm font-medium text-brand-700 hover:underline"
    >
      ← Back to payments
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {backLink}
        <p className="text-gray-500">Loading payment…</p>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="space-y-4 p-6">
        {backLink}
        <p className="text-red-600" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-4 p-6">
        {backLink}
        <p className="text-gray-500">Payment not found.</p>
      </div>
    );
  }

  const status = payment.status.toLowerCase();
  const StatusIcon = STATUS_ICONS[status];
  const currentStep = statusIndex(status);
  const isTerminalFailure = status === 'failed' || status === 'cancelled';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          {backLink}
          <h1 className="text-2xl font-semibold">Payment {payment.reference}</h1>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm capitalize ${
            STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR
          }`}
        >
          {StatusIcon ? <StatusIcon className="h-4 w-4" aria-hidden /> : null}
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="payment-details-heading" className="space-y-3">
        <h2 id="payment-details-heading" className="text-lg font-semibold">
          Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Payment ID" value={<span className="font-mono text-sm">{payment.id}</span>} />
          <Field label="Reference" value={payment.reference} />
          <Field label="Amount (USD)" value={formatUsd(payment.amountUsd)} />
          <Field
            label="Amount (XLM)"
            value={payment.amountXlm != null ? payment.amountXlm : '—'}
          />
          <Field label="Description" value={payment.description ?? '—'} />
          <Field label="Customer email" value={payment.customerEmail ?? '—'} />
          <Field label="Merchant" value={payment.merchantName ?? '—'} />
          <Field label="Stellar memo" value={<span className="font-mono text-sm">{payment.stellarMemo}</span>} />
          <Field
            label="Deposit address"
            value={
              <span className="break-all font-mono text-sm">
                {payment.stellarDepositAddress ?? '—'}
              </span>
            }
          />
          <Field label="Created" value={formatDate(payment.createdAt)} />
          <Field label="Updated" value={formatDate(payment.updatedAt)} />
          <Field label="Expires" value={formatDate(payment.expiresAt)} />
        </div>
        {payment.metadata && Object.keys(payment.metadata).length > 0 ? (
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Metadata</div>
            <dl className="mt-2 space-y-1 text-sm">
              {Object.entries(payment.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="font-medium">{key}:</dt>
                  <dd className="break-all">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="payment-timeline-heading" className="space-y-3">
        <h2 id="payment-timeline-heading" className="text-lg font-semibold">
          Status timeline
        </h2>
        <ol className="space-y-2">
          {TIMELINE_STEPS.map((step, index) => {
            const reached = !isTerminalFailure && index <= currentStep;
            return (
              <li key={step} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full ${
                    reached ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                />
                <span className={reached ? 'font-medium' : 'text-gray-500'}>
                  {step}
                </span>
                <span className="sr-only">
                  {reached ? '(reached)' : '(not reached)'}
                </span>
              </li>
            );
          })}
        </ol>
        {isTerminalFailure ? (
          <p className="text-sm text-red-600">
            Payment ended in status “{status.replace(/_/g, ' ')}”.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="payment-webhooks-heading" className="space-y-3">
        <h2 id="payment-webhooks-heading" className="text-lg font-semibold">
          Webhooks dispatched
        </h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-gray-500">No webhooks dispatched yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th scope="col" className="py-2">Event</th>
                <th scope="col" className="py-2">Status</th>
                <th scope="col" className="py-2">Response time</th>
                <th scope="col" className="py-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-gray-100">
                  <td className="py-2 font-mono text-xs">{delivery.event}</td>
                  <td className="py-2">{delivery.statusCode ?? 'no response'}</td>
                  <td className="py-2">
                    {delivery.responseTimeMs != null
                      ? `${delivery.responseTimeMs} ms`
                      : '—'}
                  </td>
                  <td className="py-2">{formatDate(delivery.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
