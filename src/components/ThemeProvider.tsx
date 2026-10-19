'use client';

import { useEffect } from 'react';
import { useThemeStore, resolveTheme } from '@/lib/themeStore';

/**
 * ThemeProvider — applies the `dark` class to `<html>` based on the persisted
 * theme preference and the OS preference, and keeps both in sync.
 *
 * Mount once in the root layout.  Uses the Tailwind `class` strategy
 * (`darkMode: 'class'` in tailwind.config.ts).
 *
 * The inline <script> in layout.tsx (ThemeScript) handles the initial
 * synchronous apply to avoid a flash-of-light-theme on first render.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolved = resolveTheme(theme, mediaQuery.matches);
      root.classList.toggle('dark', resolved === 'dark');
    };

    applyTheme();

    // Re-apply when the OS preference changes (only relevant when theme === 'system').
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  return <>{children}</>;
}
