import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(amount: number, locale?: string): string {
  // Normalise -0 to 0 so negative zero never renders as "-$0.00".
  const normalised = amount === 0 ? 0 : amount;
  const bcp47 = locale === 'pcm' ? 'en-NG' : (locale ?? 'en-US');
  return new Intl.NumberFormat(bcp47, {
    style: 'currency',
    currency: 'USD',
  }).format(normalised);
}

/**
 * Formats an amount in Nigerian Naira (NGN).
 *
 * DupDub settlements are denominated and paid out in NGN — the merchant
 * receives naira in their Nigerian bank account, not dollars. Using
 * `formatUsd` for settlement amounts showed a "$" prefix which is
 * misleading. This helper formats with the ₦ symbol and the `en-NG` locale
 * (Nigerian grouping conventions) so settlement displays match what the
 * merchant actually receives.
 *
 * Accepts an optional `locale` (BCP 47 tag) for merchants in other regions;
 * the currency is always NGN regardless of locale.
 */
export function formatNgn(amount: number, locale?: string): string {
  // Normalise -0 to 0 so negative zero never renders as "-₦0.00".
  const normalised = amount === 0 ? 0 : amount;
  const bcp47 = locale === 'pcm' ? 'en-NG' : (locale ?? 'en-NG');
  return new Intl.NumberFormat(bcp47, {
    style: 'currency',
    currency: 'NGN',
  }).format(normalised);
}

/**
 * Masks a credential (API key, webhook signing secret) for display.
 *
 * Only a fixed number of leading/trailing characters is ever revealed and the
 * bullet run has a constant length, so masking never degrades to a near-plaintext
 * reveal for short values (#337). Values too short to reveal anything safely are
 * masked completely.
 */
export function maskSecret(value: string, visible = 2, bullets = 8): string {
  const mask = '•'.repeat(bullets);
  if (value.length <= visible * 2) return mask;
  return `${value.slice(0, visible)}${mask}${value.slice(-visible)}`;
}

/**
 * Formats a timestamp for display.
 *
 * Accepts an optional `locale` (BCP 47 tag, e.g. "fr", "ha") so that merchants
 * in French-speaking or Hausa-speaking regions see dates in their own locale.
 * Nigerian Pidgin ("pcm") is not yet a recognised BCP 47 tag in most runtimes,
 * so it falls back to "en-NG" which uses the same script but Nigeria-region
 * date conventions.
 *
 * NOTE: Intentionally client-only. The output depends on the browser's local
 * time zone via `Intl.DateTimeFormat`. Rendering during SSR/build risks a
 * hydration mismatch. If a server-rendered call site is ever added, pass an
 * explicit `timeZone` (e.g. `'Africa/Lagos'` or `'UTC'`) to match server and
 * client output.
 */
export function formatDate(
  date: string | Date | undefined | null,
  locale?: string
): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  // Map app locale codes to BCP 47 tags recognised by Intl.
  const bcp47 = locale === 'pcm' ? 'en-NG' : (locale ?? 'en-US');

  return new Intl.DateTimeFormat(bcp47, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

import {
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  XCircle,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  settling: 'bg-purple-100 text-purple-800',
  settled: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

/**
 * Distinguishing icon per status so that state is never conveyed by color alone.
 * Use alongside STATUS_COLORS in badge/pill elements to meet WCAG 1.4.1 (Use of Color).
 */
export const STATUS_ICONS: Record<string, LucideIcon> = {
  pending: Clock,
  pending_approval: AlertCircle,
  confirmed: CheckCircle,
  processing: RefreshCw,
  settling: RefreshCw,
  settled: CheckCircle,
  completed: CheckCircle,
  failed: XCircle,
  expired: HelpCircle,
};

/** @deprecated use STATUS_COLORS */
export const PAYMENT_STATUS_COLORS = STATUS_COLORS;

export const DEFAULT_STATUS_COLOR = 'bg-gray-100 text-gray-600';

export const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.confirmed',
  'payment.settling',
  'payment.settled',
  'payment.failed',
  'payment.expired',
];
