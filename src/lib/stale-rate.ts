/** Relative XLM rate movement (fraction) above which the quoted amount is stale. */
export const STALE_RATE_THRESHOLD = 0.02;

/**
 * Detect whether the XLM/USD rate moved more than `threshold` (default 2%)
 * between payment creation and the latest fetched payment details.
 *
 * The implied rate is derived from `amountUsd / amountXlm`, so no separate
 * rate feed is required. Returns false when either amount is missing or
 * non-positive (e.g. the crypto amount has not been quoted yet).
 */
export function isRateStale(
  original: { amountUsd?: number; amountXlm?: number } | null | undefined,
  current: { amountUsd?: number; amountXlm?: number } | null | undefined,
  threshold: number = STALE_RATE_THRESHOLD
): boolean {
  if (!original || !current) return false;
  const originalRate = impliedRate(original);
  const currentRate = impliedRate(current);
  if (originalRate == null || currentRate == null) return false;
  return Math.abs(currentRate - originalRate) / originalRate > threshold;
}

function impliedRate(payment: {
  amountUsd?: number;
  amountXlm?: number;
}): number | null {
  const usd = payment.amountUsd;
  const xlm = payment.amountXlm;
  if (typeof usd !== 'number' || typeof xlm !== 'number') return null;
  if (!(usd > 0) || !(xlm > 0)) return null;
  return usd / xlm;
}
