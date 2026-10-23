import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useMutation } from './useMutation';

const { success, error } = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/toast', () => ({ default: { success, error } }));

describe('useMutation', () => {
  beforeEach(() => {
    success.mockClear();
    error.mockClear();
  });

  it('shows a success toast and returns the result', async () => {
    const { result } = renderHook(() =>
      useMutation(async () => 42, { successMessage: 'Saved' })
    );
    let out: number | undefined;
    await act(async () => {
      out = await result.current.mutate();
    });
    expect(out).toBe(42);
    expect(success).toHaveBeenCalledWith('Saved');
    expect(result.current.pending).toBe(false);
  });

  it('shows an error toast and resolves undefined on failure', async () => {
    const { result } = renderHook(() =>
      useMutation(
        async () => {
          throw new Error('boom');
        },
        { errorMessage: 'Failed' }
      )
    );
    let out: unknown = 'x';
    await act(async () => {
      out = await result.current.mutate();
    });
    expect(out).toBeUndefined();
    expect(error).toHaveBeenCalledWith('boom');
  });
});
