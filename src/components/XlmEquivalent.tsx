'use client';

import { useEffect, useState } from 'react';

export const XLM_REFRESH_MS = 30_000;
export const XLM_STALE_MS = 2 * 60_000;

export function isXlmRateStale(updatedAt: string | undefined, now: number): boolean {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  return Number.isFinite(t) && now - t > XLM_STALE_MS;
}

export function formatXlm(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 7 });
}

interface Props {
  amountXlm?: number | null;
  /** Timestamp of the latest payment data, used as the rate freshness marker. */
  updatedAt?: string;
}

/**
 * Shows the XLM equivalent below the USD amount. The parent keeps polling the
 * payment, so the amount follows the latest rate; the clock here re-evaluates
 * staleness every 30s.
 */
export default function XlmEquivalent({ amountXlm, updatedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), XLM_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  if (amountXlm == null || amountXlm <= 0) return null;
  const stale = isXlmRateStale(updatedAt, now);

  return (
    <div data-testid="xlm-equivalent">
      <p className="text-sm text-gray-600 mt-1">Equivalent: {formatXlm(amountXlm)} XLM</p>
      {stale && (
        <p role="alert" className="text-xs text-amber-600 mt-1">
          The XLM rate may be out of date. Refresh the page before sending.
        </p>
      )}
    </div>
  );
}
