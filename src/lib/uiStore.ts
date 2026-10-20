import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global UI state that must survive navigation but is not auth- or
 * theme-related. Kept in its own store so it can evolve independently of
 * `useAuthStore` and `useThemeStore` without coupling unrelated concerns.
 *
 * Rules of thumb:
 * - Auth state  → `useAuthStore`   (src/lib/store.ts)
 * - Theme pref  → `useThemeStore`  (src/lib/themeStore.ts)
 * - UI/UX prefs that survive navigation → this store
 * - Per-page / ephemeral state → local `useState` inside the component
 */

interface UiState {
  /**
   * Whether the merchant has dismissed the onboarding checklist banner.
   * Persisted so the banner stays hidden on reload.
   */
  onboardingDismissed: boolean;
  dismissOnboarding: () => void;

  /**
   * Controls the visibility of the help widget panel. Not persisted — the
   * widget always starts closed; we just want one canonical place to open it
   * programmatically (e.g. from error messages that link to the FAQ).
   */
  helpPanelOpen: boolean;
  setHelpPanelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      onboardingDismissed: false,
      dismissOnboarding: () => set({ onboardingDismissed: true }),

      helpPanelOpen: false,
      setHelpPanelOpen: (open) => set({ helpPanelOpen: open }),
    }),
    {
      name: 'dupdub-ui',
      // Only persist preferences that should survive a page reload.
      // Ephemeral open/closed state is excluded so panels always start closed.
      partialize: (state) => ({
        onboardingDismissed: state.onboardingDismissed,
      }),
    }
  )
);
