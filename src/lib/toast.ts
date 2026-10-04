import baseToast from 'react-hot-toast';

/**
 * Accessibility-aware toast helpers.
 *
 * react-hot-toast's `toastOptions.error.ariaProps` is NOT honoured by the
 * library — per-type options only merge `style`, `duration` and `removeDelay`,
 * so every toast renders with the default `role="status"` / `aria-live="polite"`.
 * Passing `ariaProps` on the individual call *is* honoured, so we do that here
 * to get correct live-region semantics: polite for success, assertive for error.
 *
 * Consumers should import from '@/lib/toast' rather than 'react-hot-toast'.
 */
type AriaProps = { role: 'status' | 'alert'; 'aria-live': 'polite' | 'assertive' };

const POLITE: AriaProps = { role: 'status', 'aria-live': 'polite' };
const ASSERTIVE: AriaProps = { role: 'alert', 'aria-live': 'assertive' };

export const toast = {
  ...baseToast,
  success: (message: string, options?: Record<string, unknown>) =>
    baseToast.success(message, { ariaProps: POLITE, ...options }),
  error: (message: string, options?: Record<string, unknown>) =>
    baseToast.error(message, { ariaProps: ASSERTIVE, ...options }),
};

export default toast;
export { Toaster } from 'react-hot-toast';
