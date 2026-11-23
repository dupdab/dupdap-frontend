import { getApiUrl } from '@/lib/env';
import { formatUsd, formatDate } from '@/lib/utils';

import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptPayment {
  id?: string;
  reference?: string;
  amountUsd?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  settledAt?: string;
  description?: string;
  merchant?: { businessName?: string };
  merchantName?: string;
  transactionHash?: string;
  txHash?: string;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchReceiptPayment(
  paymentId: string
): Promise<ReceiptPayment | null> {
  try {
    const res = await fetch(
      `${getApiUrl()}/pay/${encodeURIComponent(paymentId)}`,
      // Receipts are immutable once settled — cache for 5 minutes.
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return (await res.json()) as ReceiptPayment;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: { paymentId: string };
}): Promise<Metadata> {
  const payment = await fetchReceiptPayment(params.paymentId);
  const merchantName =
    payment?.merchant?.businessName ?? payment?.merchantName ?? null;
  const amount =
    typeof payment?.amountUsd === 'number'
      ? formatUsd(payment.amountUsd)
      : null;

  const title =
    amount && merchantName
      ? `Receipt — ${amount} to ${merchantName}`
      : 'Payment Receipt';

  return {
    title,
    description: 'Printable payment receipt from DupDub.',
    robots: { index: false, follow: false },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReceiptPage({
  params,
}: {
  params: { paymentId: string };
}) {
  const payment = await fetchReceiptPayment(params.paymentId);

  if (!payment) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            Receipt not found
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            We couldn&apos;t find a receipt for this payment.
          </p>
        </div>
      </main>
    );
  }

  const merchantName =
    payment.merchant?.businessName ?? payment.merchantName ?? 'DupDub';
  const transactionHash = payment.transactionHash ?? payment.txHash;
  const paidAt = payment.settledAt ?? payment.updatedAt ?? payment.createdAt;

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    {
      label: 'Amount paid',
      value:
        typeof payment.amountUsd === 'number'
          ? formatUsd(payment.amountUsd)
          : '—',
    },
    { label: 'Date', value: formatDate(paidAt) },
    { label: 'Merchant', value: merchantName },
    {
      label: 'Transaction hash',
      value: transactionHash ?? '—',
      mono: true,
    },
  ];

  if (payment.reference) {
    rows.push({ label: 'Reference', value: payment.reference, mono: true });
  }
  if (payment.description) {
    rows.push({ label: 'Description', value: payment.description });
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center p-4 print:bg-white print:p-0">
      <article
        data-testid="payment-receipt-page"
        className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 mt-8 print:border-0 print:rounded-none print:mt-0 print:max-w-none"
      >
        <header className="text-center border-b border-gray-100 pb-4 mb-4">
          <p className="text-sm font-medium text-gray-500">DupDub</p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Payment Receipt
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            This payment has been settled.
          </p>
        </header>

        <dl className="divide-y divide-gray-100 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between gap-4 py-3 print:py-2"
            >
              <dt className="text-gray-500 shrink-0">{row.label}</dt>
              <dd
                className={`text-gray-900 text-right break-all ${
                  row.mono ? 'font-mono text-xs' : 'font-medium'
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <footer className="mt-6 text-center text-xs text-gray-400">
          Generated by DupDub — keep this receipt for your records.
        </footer>
      </article>
    </main>
  );
}