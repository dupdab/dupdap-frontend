import { describe, expect, it, beforeEach } from 'vitest';

import { useAuthStore, clearLegacyAccessTokenKey } from './store';

import type { Merchant } from './types';

const testMerchant: Merchant = {
  id: 'merchant-1',
  email: 'test@example.com',
  businessName: 'Test Business',
  status: 'active',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ merchant: null, hasHydrated: false });
  });

  describe('setAuth()', () => {
    it('updates the merchant in the store', () => {
      useAuthStore.getState().setAuth(testMerchant);
      expect(useAuthStore.getState().merchant).toEqual(testMerchant);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('persists the merchant to localStorage under the dupdub-auth key', () => {
      useAuthStore.getState().setAuth(testMerchant);
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.merchant).toEqual(testMerchant);
    });

    it('removes the legacy access_token key from localStorage', () => {
      localStorage.setItem('access_token', 'legacy');
      useAuthStore.getState().setAuth(testMerchant);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('logout()', () => {
    it('clears the merchant from the store', async () => {
      useAuthStore.getState().setAuth(testMerchant);
      await useAuthStore.getState().logout();
      expect(useAuthStore.getState().merchant).toBeNull();
    });

    it('persists the cleared state to localStorage', async () => {
      useAuthStore.getState().setAuth(testMerchant);
      await useAuthStore.getState().logout();
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.merchant).toBeNull();
    });

    it('removes the legacy access_token key from localStorage', async () => {
      localStorage.setItem('access_token', 'old-token');
      await useAuthStore.getState().logout();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('persist middleware', () => {
    it('persists only merchant and does not serialize hasHydrated', () => {
      useAuthStore.getState().setAuth(testMerchant);
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.merchant).toEqual(testMerchant);
      expect(stored.state.hasHydrated).toBeUndefined();
    });

    it('sets hasHydrated to true upon rehydration from storage', async () => {
      useAuthStore.setState({ hasHydrated: false, merchant: null });
      localStorage.setItem(
        'dupdub-auth',
        JSON.stringify({ state: { merchant: testMerchant } }),
      );
      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().hasHydrated).toBe(true);
      expect(useAuthStore.getState().merchant).toEqual(testMerchant);
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
