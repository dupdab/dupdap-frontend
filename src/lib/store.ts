import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Merchant } from './types';
import { authApi, merchantsApi } from './api';

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  /** True once Zustand's persist middleware has finished rehydrating from localStorage. */
  hasHydrated: boolean;
  setAuth: (merchant: Merchant) => void;
  /** Fetch the merchant profile from the API instead of trusting localStorage (#857). */
  fetchProfile: () => Promise<void>;
  logout: () => Promise<void>;
  _setHasHydrated: (value: boolean) => void;
}

const LEGACY_TOKEN_KEY = 'access_token';

/** Remove any legacy access_token key written to localStorage (#484). */
export function clearLegacyAccessTokenKey() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

/**
 * Only the auth token may live in localStorage. The merchant profile contains
 * business name, country and role and must be fetched from the API on demand
 * so browser extensions cannot read it from plaintext storage (#857).
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
      fetchProfile: async () => {
        try {
          const { data } = await merchantsApi.getProfile();
          set({ merchant: data });
        } catch {
          // No authenticated session (or network failure) — leave merchant null.
        }
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
      version: 2,
      // Bump the version and drop the old merchant field so previously stored
      // profiles are discarded instead of merged back into the live store.
      migrate: (persistedState) => {
        const persisted = { ...(persistedState as Record<string, unknown>) };
        delete persisted.merchant;
        return persisted as unknown as AuthState;
      },
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        clearLegacyAccessTokenKey();
        const finish = () => {
          if (state) {
            state._setHasHydrated(true);
          } else {
            useAuthStore.getState()._setHasHydrated(true);
          }
        };
        // Never trust a profile read from storage: clear it and fetch on demand.
        if (state) state.merchant = null;
        void useAuthStore.getState().fetchProfile().finally(finish);
      },
    }
  )
);
