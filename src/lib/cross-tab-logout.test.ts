import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startCrossTabLogoutListener } from './cross-tab-logout';
import { useAuthStore } from './store';

import type { Merchant } from './types';

vi.mock('./api', () => ({
  authApi: { logout: vi.fn().mockResolvedValue(undefined) },
  merchantsApi: { getProfile: vi.fn().mockResolvedValue({ data: null }) },
}));

const testMerchant: Merchant = {
  id: 'merchant-1',
  email: 'test@example.com',
  businessName: 'Test Business',
  status: 'active',
};

function fireStorage(init: StorageEventInit) {
  window.dispatchEvent(new StorageEvent('storage', init));
}

describe('startCrossTabLogoutListener (#760)', () => {
  let stop: () => void;

  beforeEach(() => {
    useAuthStore.setState({ token: 'tok', merchant: testMerchant });
    stop = startCrossTabLogoutListener();
  });

  afterEach(() => {
    stop();
  });

  it('logs out when another tab removes the persisted auth key', () => {
    fireStorage({ key: 'dupdub-auth', newValue: null });
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().merchant).toBeNull();
  });

  it('logs out when another tab persists a state without a token', () => {
    fireStorage({
      key: 'dupdub-auth',
      newValue: JSON.stringify({ state: { token: null }, version: 2 }),
    });
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().merchant).toBeNull();
  });

  it('logs out when another tab clears all of localStorage', () => {
    fireStorage({ key: null, newValue: null });
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('stays logged in when the persisted state still has a token', () => {
    fireStorage({
      key: 'dupdub-auth',
      newValue: JSON.stringify({ state: { token: 'tok' }, version: 2 }),
    });
    expect(useAuthStore.getState().token).toBe('tok');
    expect(useAuthStore.getState().merchant).toEqual(testMerchant);
  });

  it('ignores storage events for unrelated keys', () => {
    fireStorage({ key: 'theme', newValue: null });
    expect(useAuthStore.getState().token).toBe('tok');
  });

  it('stops listening after the returned cleanup runs', () => {
    stop();
    fireStorage({ key: 'dupdub-auth', newValue: null });
    expect(useAuthStore.getState().token).toBe('tok');
  });
});
