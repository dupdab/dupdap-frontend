'use client';

import { useEffect, useState } from 'react';

import {
  buildWalletDeepLink,
  detectMobilePlatform,
  getStoreLink,
  type MobilePlatform,
  type WalletId,
  type WalletPaymentParams,
} from '@/lib/wallet-deep-links';

const WALLETS: { id: WalletId; label: string }[] = [
  { id: 'lobstr', label: 'Open in Lobstr' },
  { id: 'solar', label: 'Open in Solar' },
];

const FALLBACK_DELAY_MS = 1500;

export function OpenInWalletButtons({
  payment,
}: {
  payment: WalletPaymentParams;
}) {
  const [platform, setPlatform] = useState<MobilePlatform>(null);

  useEffect(() => {
    setPlatform(detectMobilePlatform(navigator.userAgent));
  }, []);

  if (!platform) return null;

  const open = (wallet: WalletId) => {
    const storeUrl = getStoreLink(wallet, platform);
    // If the app is installed the page is backgrounded; otherwise send the user to the store.
    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible')
        window.location.href = storeUrl;
    }, FALLBACK_DELAY_MS);
    const cancel = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', cancel);
      }
    };
    document.addEventListener('visibilitychange', cancel);
    window.location.href = buildWalletDeepLink(wallet, payment);
  };

  return (
    <div className="grid grid-cols-2 gap-2 mb-4" data-testid="open-in-wallet">
      {WALLETS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => open(id)}
          className="btn-secondary"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
