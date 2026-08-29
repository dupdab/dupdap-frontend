import type { Merchant } from './types';

export function isAdmin(merchant: Merchant | null | undefined): boolean {
  return merchant?.role === 'admin' || merchant?.role === 'staff';
}
