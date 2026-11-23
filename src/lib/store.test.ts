import { describe, expect, it, beforeEach, vi } from 'vitest';

import { useAuthStore, clearLegacyAccessTokenKey } from './store';

import type { Merchant } from './types';

vi.mock('./api', () => ({
  authApi: { logout: vi.fn().mockResolvedValue(undefined) },
  merchantsApi: { getProfile: vi.fn().mockResolvedValue({ data: null }) },
}));

import { merchantsApi, authApi } from './api';

const testMerchant: Merchant = {
  id: 'merchant-1',
  email: 'test@example.com',
  businessName: 'Test Business',
  status: 'active',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(merchantsApi.getProfile).mockResolvedValue({
      data: testMerchant,
    } as Awaited<ReturnType<typeof merchantsApi.getProfile>>);
    useAuthStore.setState({ merchant: null, token: null, hasHydrated: false });
  });

  describe('setAuth()', () => {
    it('updates the merchant in the store', () => {
      useAuthStore.getState().setAuth(testMerchant);
      expect(useAuthStore.getState().merchant).toEqual(testMerchant);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('does not write the merchant profile to localStorage (#857)', () => {
      useAuthStore.getState().setAuth(testMerchant);
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.merchant).toBeUndefined();
      expect(JSON.stringify(stored)).not.toContain('Test Business');
    });

    it('removes the legacy access_token key from localStorage', () => {
      localStorage.setItem('access_token', 'legacy');
      useAuthStore.getState().setAuth(testMerchant);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('fetchProfile()', () => {
    it('loads the merchant profile from the API on demand', async () => {
      await useAuthStore.getState().fetchProfile();
      expect(merchantsApi.getProfile).toHaveBeenCalled();
      expect(useAuthStore.getState().merchant).toEqual(testMerchant);
    });
  });

  describe('logout()', () => {
    it('calls POST /auth/logout before clearing local state (#768)', async () => {
      useAuthStore.getState().setAuth(testMerchant);
      await useAuthStore.getState().logout();
      expect(authApi.logout).toHaveBeenCalledTimes(1);
    });

    it('still clears local state when the logout request fails (#768)', async () => {
      vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('network'));
      useAuthStore.getState().setAuth(testMerchant);
      await useAuthStore.getState().logout();
      expect(authApi.logout).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().merchant).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('clears the merchant from the store', async () => {
      useAuthStore.getState().setAuth(testMerchant);
      await useAuthStore.getState().logout();
      expect(useAuthStore.getState().merchant).toBeNull();
    });

    it('persists no merchant profile to localStorage', async () => {
      useAuthStore.getState().setAuth(testMerchant);
      await useAuthStore.getState().logout();
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.merchant).toBeUndefined();
    });

    it('removes the legacy access_token key from localStorage', async () => {
      localStorage.setItem('access_token', 'old-token');
      await useAuthStore.getState().logout();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('persist middleware', () => {
    it('persists only the token and drops the merchant profile (#857)', () => {
      useAuthStore.getState().setAuth(testMerchant);
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state).toEqual({ token: null });
      expect(stored.state.hasHydrated).toBeUndefined();
      expect(stored.state.merchant).toBeUndefined();
    });

    it('migrates old v1 persisted state by removing merchant', async () => {
      useAuthStore.setState({ hasHydrated: false, merchant: null });
      localStorage.setItem(
        'dupdub-auth',
        JSON.stringify({
          version: 1,
          state: { merchant: testMerchant, hasHydrated: true },
        })
      );
      await useAuthStore.persist.rehydrate();
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(JSON.stringify(stored)).not.toContain('Test Business');
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    it('sets hasHydrated to true even when storage is empty', async () => {
      useAuthStore.setState({ hasHydrated: false, merchant: null });
      localStorage.clear();
      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });
  });

  describe('clearLegacyAccessTokenKey()', () => {
    it('removes the access_token key from localStorage', () => {
      localStorage.setItem('access_token', 'legacy-value');
      clearLegacyAccessTokenKey();
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('does nothing when access_token key does not exist', () => {
      expect(() => clearLegacyAccessTokenKey()).not.toThrow();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });
});
