import { render, screen, act } from '@testing-library/react';
import toast, { Toaster } from 'react-hot-toast';

/**
 * Smoke test for issue #394: the root layout's <Toaster /> must render
 * toasts in an accessibility-queryable form so screen readers announce
 * success and error feedback.
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

    const alert = await screen.findByRole('status');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
