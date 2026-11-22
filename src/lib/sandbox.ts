import type { Merchant } from './types';

/**
 * Sandbox merchants see test-only data. Detect it from the merchant record
 * returned by the API, with an environment override for local/test setups.
 */
export function isSandboxMode(
  merchant?: Pick<
    Merchant,
    'status' | 'mode' | 'environment' | 'testMode'
  > | null
): boolean {
  if (process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true') return true;
  if (!merchant) return false;
  if (merchant.testMode === true) return true;
  const value = merchant.mode ?? merchant.environment ?? merchant.status;
  return typeof value === 'string' && value.toLowerCase() === 'sandbox';
}
