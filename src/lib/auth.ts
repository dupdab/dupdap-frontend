import type { Merchant } from './types';

export function isAdmin(merchant: Merchant | null | undefined): boolean {
  return merchant?.role === 'admin' || merchant?.role === 'staff';
}

/**
 * Returns true when the merchant is known and authorized as an admin.
 *
 * Unlike {@link isAdmin}, this distinguishes "not yet loaded" (merchant is
 * null/undefined) from "loaded but unauthorized". Callers can use this to
 * render a loading state while the merchant is still resolving instead of
 * rendering blank content and then redirecting, which caused a
 * render-then-redirect flash on the admin authorization boundary.
 */
export function isAdminResolved(merchant: Merchant | null | undefined): boolean {
  return merchant != null && isAdmin(merchant);
}
