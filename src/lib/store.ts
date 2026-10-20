import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Merchant } from './types';
import { authApi } from './api';

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  /** True once Zustand's persist middleware has finished rehydrating from localStorage. */
  hasHydrated: boolean;
  setAuth: (merchant: Merchant) => void;
  logout: () => Promise<void>;
  _setHasHydrated: (value: boolean) => void;
}

const LEGACY_TOKEN_KEY = 'access_token';

/** Remove the legacy duplicate key written before #143 unified auth storage. */
export function clearLegacyAccessTokenKey() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

/**
 * Auth token is stored in an httpOnly cookie managed by the backend.
 * The frontend only persists the merchant object in localStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      merchant: null,
      hasHydrated: false,
      setAuth: (merchant) => {
        clearLegacyAccessTokenKey();
        set({ merchant });
      },
      logout: async () => {
        clearLegacyAccessTokenKey();
        try {
          await authApi.logout();
        } catch {
          // Ignore errors; we still clear local state
        }
        set({ token: null, merchant: null });
      },
      _setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'dupdub-auth',
      partialize: (state) => ({ merchant: state.merchant }),
      onRehydrateStorage: () => (state) => {
        clearLegacyAccessTokenKey();
        // Mark hydration complete so the dashboard can stop showing its loading
        // spinner. `state` is undefined when there is no persisted data yet
        // (first-ever visit), so fall back to the store's own setter.
        if (state) {
          state._setHasHydrated(true);
        } else {
          useAuthStore.getState()._setHasHydrated(true);
        }
      },
    },
  ),
);
