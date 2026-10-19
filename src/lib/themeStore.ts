import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Resolves the effective color scheme for a given theme preference and system
 * preference, so callers can determine whether `dark` should appear on <html>.
 */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light';
  return theme;
}

/**
 * Zustand store for the user's color-scheme preference, persisted to
 * localStorage under 'dupdub-theme'.  Defaults to 'system' so new users
 * automatically follow their OS preference.
 *
 * The store only holds the *preference*; the `ThemeProvider` component is
 * responsible for applying/removing the `dark` class on `<html>` and keeping
 * it in sync when the OS preference changes.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system' as Theme,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'dupdub-theme',
    },
  ),
);
