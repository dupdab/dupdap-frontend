import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useOnlineStatus } from './useOnlineStatus';

function setBrowserOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

afterEach(() => {
  setBrowserOnline(true);
});

describe('useOnlineStatus (#547)', () => {
  it('reads the initial status from navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  it('flips to false when the offline event fires, and back on online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => setBrowserOnline(false));
    expect(result.current).toBe(false);

    act(() => setBrowserOnline(true));
    expect(result.current).toBe(true);
  });

  it('reacts to status changes after mount', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
