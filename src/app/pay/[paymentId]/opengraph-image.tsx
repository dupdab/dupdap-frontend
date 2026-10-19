import { ImageResponse } from 'next/og';
import { getApiUrl } from '@/lib/env';

// Uses next/og (the engine behind @vercel/og), bundled with Next.js >= 13.3.
export const alt = 'DupDub payment request';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Re-generate at most once every 5 minutes.
export const revalidate = 300;

interface OgPayment {
  amountUsd?: number;
  merchant?: { businessName?: string };
  merchantName?: string;
}

async function loadPayment(paymentId: string): Promise<OgPayment | null> {
  try {
    const res = await fetch(`${getApiUrl()}/pay/${encodeURIComponent(paymentId)}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as OgPayment;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { paymentId: string } }) {
  const payment = await loadPayment(params.paymentId);
  const merchant = payment?.merchant?.businessName ?? payment?.merchantName ?? 'a DupDub merchant';
  const amount = typeof payment?.amountUsd === 'number' ? `$${payment.amountUsd.toFixed(2)} USD` : null;
  const headline = amount ? `Pay DupDub — ${amount}` : 'Pay with DupDub';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#fefce8',
          color: '#422006',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 16,
              background: '#eab308',
              color: '#ffffff',
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div style={{ marginLeft: 20, fontSize: 44, fontWeight: 700, color: '#a16207' }}>DupDub</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>{headline}</div>
          <div style={{ fontSize: 44, marginTop: 24, color: '#854d0e' }}>to {merchant}</div>
        </div>
        <div style={{ fontSize: 28, color: '#a16207' }}>Secure crypto-to-fiat payments</div>
      </div>
    ),
    { ...size },
  );
}
