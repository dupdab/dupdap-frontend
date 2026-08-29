import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Merchant } from './types';

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  setAuth: (token: string, merchant: Merchant) => void;
  logout: () => void;
}

const LEGACY_TOKEN_KEY = 'access_token';

/** Remove the legacy duplicate key written before #143 unified auth storage. */
export function clearLegacyAccessTokenKey() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

/**
 * Auth token is persisted via Zustand (`dupdub-auth` key) as the single source of truth.
 * SECURITY (#142): tokens in localStorage remain readable to any XSS payload. The
 * recommended long-term fix is an httpOnly, SameSite=Strict cookie issued by the backend.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      merchant: null,
      setAuth: (token, merchant) => {
        clearLegacyAccessTokenKey();
        set({ token, merchant });
      },
      logout: () => {
        clearLegacyAccessTokenKey();
        set({ token: null, merchant: null });
      },
    }),
    { name: 'dupdub-auth', onRehydrateStorage: () => () => clearLegacyAccessTokenKey() },
  ),
);
