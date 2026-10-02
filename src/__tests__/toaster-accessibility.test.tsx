import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import toast from '@/lib/toast';

/**
 * Smoke test for issue #394: the root layout's <Toaster /> must render
 * toasts in an accessibility-queryable form so screen readers announce
 * success and error feedback.
 *
 * A bare <Toaster /> is rendered because react-hot-toast ignores per-type
 * `ariaProps` in `toastOptions`; the live-region semantics come from the
 * per-call options applied by '@/lib/toast' (#394).
 */

describe('Toaster accessibility', () => {
  afterEach(() => {
    act(() => {
      toast.dismiss();
    });
  });

  it('renders a success toast in a role="status" live region', async () => {
    render(<Toaster position="top-right" />);

    act(() => {
      toast.success('Saved successfully');
    });

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Saved successfully');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('renders an error toast in an assertive live region', async () => {
    render(<Toaster position="top-right" />);

    act(() => {
      toast.error('Something went wrong');
    });

    // Errors use role="alert", which is an assertive live region.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
