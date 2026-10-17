export type WalletId = 'lobstr' | 'solar';
export type MobilePlatform = 'ios' | 'android' | null;

export interface WalletPaymentParams {
  destination: string;
  amount: string | number;
  memo: string;
}

const STORE_LINKS: Record<WalletId, { ios: string; android: string }> = {
  lobstr: {
    ios: 'https://apps.apple.com/app/lobstr-stellar-wallet/id1404357892',
    android: 'https://play.google.com/store/apps/details?id=com.lobstr.client',
  },
  solar: {
    ios: 'https://apps.apple.com/app/solar-wallet/id1458591466',
    android: 'https://play.google.com/store/apps/details?id=org.satoshipay.solar',
  },
};

export function detectMobilePlatform(userAgent: string): MobilePlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return null;
}

export function buildWalletDeepLink(wallet: WalletId, p: WalletPaymentParams): string {
  const query =
    `destination=${encodeURIComponent(p.destination)}` +
    `&amount=${encodeURIComponent(String(p.amount))}` +
    `&memo=${encodeURIComponent(p.memo)}&memo_type=text`;
  return `${wallet}://pay?${query}`;
}

export function getStoreLink(wallet: WalletId, platform: Exclude<MobilePlatform, null>): string {
  return STORE_LINKS[wallet][platform];
}
