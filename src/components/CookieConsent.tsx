import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookie-consent';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type ConsentValue = 'accepted' | 'rejected';

interface StoredConsent {
  value: ConsentValue;
  expiresAt: number;
}

function readConsent(): ConsentValue | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed || typeof parsed.expiresAt !== 'number') return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.value === 'accepted' || parsed.value === 'rejected'
      ? parsed.value
      : null;
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentValue): void {
  try {
    const stored: StoredConsent = {
      value,
      expiresAt: Date.now() + ONE_YEAR_MS,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage failures (e.g. private mode); banner will re-prompt.
  }
}

function loadAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (document.getElementById('analytics-script')) return;
  const script = document.createElement('script');
  script.id = 'analytics-script';
  script.async = true;
  script.src = '/analytics.js';
  document.head.appendChild(script);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (consent === 'accepted') {
      loadAnalytics();
    } else if (consent === null) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    writeConsent('accepted');
    loadAnalytics();
    setVisible(false);
    setShowPreferences(false);
  };

  const handleReject = () => {
    writeConsent('rejected');
    setVisible(false);
    setShowPreferences(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          We use cookies to improve your experience and analyse site usage. You
          can accept or reject non-essential cookies.{' '}
          <button
            type="button"
            onClick={() => setShowPreferences((prev) => !prev)}
            className="font-medium text-blue-600 underline"
          >
            Manage preferences
          </button>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleReject}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Accept all
          </button>
        </div>
      </div>
      {showPreferences && (
        <div className="mx-auto mt-3 max-w-5xl rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-medium">Cookie preferences</p>
          <ul className="mt-2 list-disc pl-5">
            <li>Strictly necessary cookies are always enabled.</li>
            <li>
              Analytics cookies are only enabled when you choose “Accept all”.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
