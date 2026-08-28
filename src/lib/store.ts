import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Merchant } from './types';

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  setAuth: (token: string, merchant: Merchant) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      merchant: null,
      setAuth: (token, merchant) => {
        localStorage.setItem('access_token', token);
        set({ token, merchant });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        set({ token: null, merchant: null });
      },
    }),
    { name: 'dupdub-auth' },
  ),
);
