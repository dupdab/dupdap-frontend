export interface RevenueBreakdownInput {
  amountUsd: number | string;
  status?: string;
  paymentMethod?: string | null;
}

export interface RevenueBreakdownRow {
  name: string;
  value: number;
  count: number;
}

export const DEFAULT_PAYMENT_METHOD = 'Stellar (XLM)';

/**
 * Groups payment volume (USD) by payment method, falling back to the
 * platform default channel when the API does not report one.
 * Failed and expired payments are excluded. Rows are sorted by volume.
 */
export function breakdownByPaymentMethod(payments: RevenueBreakdownInput[]): RevenueBreakdownRow[] {
  const map = new Map<string, RevenueBreakdownRow>();
  for (const p of payments) {
    if (p.status === 'failed' || p.status === 'expired') continue;
    const amount = parseFloat(String(p.amountUsd));
    if (!Number.isFinite(amount)) continue;
    const name = p.paymentMethod?.trim() || DEFAULT_PAYMENT_METHOD;
    const row = map.get(name) ?? { name, value: 0, count: 0 };
    row.value += amount;
    row.count += 1;
    map.set(name, row);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}
