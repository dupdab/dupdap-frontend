'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore, type Theme } from '@/lib/themeStore';

const THEMES: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * ThemeToggle — a compact three-way toggle (Light / Dark / System) for use
 * in the dashboard sidebar.  Persists the choice to localStorage via the
 * Zustand theme store; ThemeProvider picks it up and applies the `dark` class.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="flex items-center gap-1 px-3 py-2"
    >
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          data-testid={`theme-${value}`}
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          aria-label={`${label} theme`}
          title={label}
          className={
            theme === value
              ? 'p-1.5 rounded text-brand-600 bg-brand-50 dark:bg-brand-950 dark:text-brand-300'
              : 'p-1.5 rounded text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          }
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
