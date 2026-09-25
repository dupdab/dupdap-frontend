import '@testing-library/jest-dom';

// react-hot-toast renders toasts into a portal on document.body. jsdom does not
// implement the ARIA live-region announcement semantics, so we assert the
// accessibility-relevant attributes react-hot-toast applies to each toast.
// This guards the root layout's <Toaster /> configuration (issue #394): toasts
// must be exposed as role="status" with aria-live="polite" so screen readers
// announce success/error feedback surfaced from forms across the app.
import { toast } from 'react-hot-toast';

describe('react-hot-toast accessibility', () => {
  afterEach(() => {
    toast.dismiss();
  });

  it('exposes fired toasts as an accessibility-queryable status region', async () => {
    toast.success('Saved successfully');

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Saved successfully');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('announces error toasts assertively', async () => {
    toast.error('Something went wrong');

    const alert = await screen.findByRole('status');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
