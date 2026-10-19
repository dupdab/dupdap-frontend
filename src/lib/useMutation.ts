'use client';

import { useCallback, useState } from 'react';
import toast from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';

interface UseMutationOptions<TData> {
  /** Toast shown on success. Pass a function to derive it from the result. Omit to stay silent. */
  successMessage?: string | ((data: TData) => string);
  /** Fallback toast shown when the error carries no message. */
  errorMessage?: string;
  onSuccess?: (data: TData) => void;
  onError?: (err: unknown) => void;
}

/**
 * Shared wrapper for dashboard mutations. Tracks the pending state and shows a
 * success or error toast automatically. `mutate` resolves with the result, or
 * `undefined` if the mutation failed (the error has already been surfaced).
 */
export function useMutation<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<TData>,
  options: UseMutationOptions<TData> = {},
) {
  const [pending, setPending] = useState(false);
  const { successMessage, errorMessage, onSuccess, onError } = options;

  const mutate = useCallback(
    async (...args: TArgs): Promise<TData | undefined> => {
      setPending(true);
      try {
        const data = await fn(...args);
        if (successMessage) {
          toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage);
        }
        onSuccess?.(data);
        return data;
      } catch (err) {
        toast.error(getErrorMessage(err) ?? errorMessage ?? 'Something went wrong');
        onError?.(err);
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [fn, successMessage, errorMessage, onSuccess, onError],
  );

  return { mutate, pending };
}

export default useMutation;
