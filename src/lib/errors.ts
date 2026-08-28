import { AxiosError } from 'axios';

/** Extract a human-readable error message from an unknown thrown value. */
export function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return undefined;
}