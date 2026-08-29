import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Merchant {
  id: string;
  email: string;
  businessName: string;
  status: string;
}

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  /** True once Zustand's persist middleware has finished rehydrating from localStorage. */
  hasHydrated: boolean;
  setAuth: (token: string, merchant: Merchant) => void;
  logout: () => void;
  _setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      merchant: null,
      hasHydrated: false,
      setAuth: (token, merchant) => {
        // Single write path: persist middleware will sync the 'dupdub-auth' key.
        // No duplicate localStorage.setItem — consumers that need the raw token
        // should read it from the store, not from a separate 'access_token' key.
        set({ token, merchant });
      },
      logout: () => {
        // Single write path: clearing state triggers persist to overwrite the key.
        set({ token: null, merchant: null });
      },
      _setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'dupdub-auth',
      onRehydrateStorage: () => (state) => {
        // Mark hydration complete so the dashboard layout can safely evaluate
        // the auth guard without racing against the async localStorage read.
        state?._setHasHydrated(true);
      },
    },
  ),
);
