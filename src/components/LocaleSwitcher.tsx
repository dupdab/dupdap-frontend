'use client';

/**
 * LocaleSwitcher — a compact <select> that lets the user pick their preferred
 * language. Reads/writes from LocaleContext (persisted to localStorage).
 */

import { useLocale, LOCALE_LABELS, type SupportedLocale } from '@/lib/locale';

interface LocaleSwitcherProps {
  className?: string;
}

export function LocaleSwitcher({ className = '' }: LocaleSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="locale-select" className="text-xs text-gray-500 shrink-0">
        {t('common.language')}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
        aria-label={t('common.language')}
      >
        {(Object.keys(LOCALE_LABELS) as SupportedLocale[]).map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
