import { getApiUrl } from '@/lib/env';

import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OgPayment {
  amountUsd?: number;
  merchant?: { businessName?: string };
  merchantName?: string;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchPayment(paymentId: string): Promise<OgPayment | null> {
  try {
    const res = await fetch(
      `${getApiUrl()}/pay/${encodeURIComponent(paymentId)}`,
      // Revalidate at most every 5 minutes — mirrors the OG image revalidation window.
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return (await res.json()) as OgPayment;
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
  const payment = await fetchPayment(params.paymentId);

  const merchantName =
    payment?.merchant?.businessName ?? payment?.merchantName ?? null;

  const amount =
    typeof payment?.amountUsd === 'number'
      ? `$${payment.amountUsd.toFixed(2)}`
      : null;

  const title =
    amount && merchantName
      ? `Pay ${amount} to ${merchantName}`
      : amount
        ? `Pay ${amount}`
        : 'Payment Request';

  const description =
    merchantName && amount
      ? `Pay ${merchantName} ${amount} with USDC on Stellar`
      : 'Pay with USDC on Stellar via DupDub';

  const ogImageUrl = `https://dupdub.com/pay/${params.paymentId}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
