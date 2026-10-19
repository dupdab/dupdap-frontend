'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:w-80"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">Install this app</p>
        <p className="text-xs text-gray-600">
          Add it to your home screen for faster access.
        </p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Install
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </div>
  );
}
