/**
 * @file forgot-password.test.tsx
 * @description Test suite for the Forgot Password page (Issue #381).
 *
 * Note: authApi.forgotPassword is called by the page but is not yet defined in
 * src/lib/api.ts (it only has register and login). The mock below defines it so
 * tests exercise the full component logic as documented in the page source.
 *
 * Covers:
 *  - Renders email input and Send button
 *  - Shows "Sending..." loading state while request is in flight
 *  - On 2xx success: transitions to "Check your email" confirmation screen
 *  - On 4xx error (< 500): also transitions to confirmation (avoids account enumeration)
 *  - On 5xx / network error: shows generic error toast (stays on form)
 *  - "Back to sign in" link present
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ForgotPasswordPage from './page';

/* jsdom matchMedia stub for react-hot-toast */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockForgotPassword = vi.fn();

vi.mock('@/lib/api', () => ({
  authApi: {
    forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('lucide-react', () => ({
  MailCheck: () => <span data-testid="icon-mailcheck">✓</span>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe('ForgotPasswordPage — form', () => {
  it('renders email input and Send reset link button', () => {
    render(<ForgotPasswordPage />);
    // The source label has no htmlFor attribute — query input by type
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders "Back to sign in" link', () => {
    render(<ForgotPasswordPage />);
    const link = screen.getByRole('link', { name: /back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/auth/login');
  });

  it('shows "Sending..." while request is in flight', async () => {
    mockForgotPassword.mockReturnValue(new Promise(() => {}));
    render(<ForgotPasswordPage />);

    // The source's <label>Email</label> has no htmlFor — query by role instead
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('button', { name: /sending/i })).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage — success flow', () => {
  it('transitions to confirmation screen on successful API call', async () => {
    mockForgotPassword.mockResolvedValue({});
    render(<ForgotPasswordPage />);

    // The source's <label>Email</label> has no htmlFor — query by role instead
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your email/i)).toBeInTheDocument(),
    );
    expect(screen.getByTestId('icon-mailcheck')).toBeInTheDocument();
    // The typed email should appear in the confirmation message
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument();
  });

  it('treats 4xx API errors as success (avoids account enumeration)', async () => {
    mockForgotPassword.mockRejectedValue({
      response: { status: 404, data: { message: 'Not found' } },
    });
    render(<ForgotPasswordPage />);

    // The source's <label>Email</label> has no htmlFor — query by role instead
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'noone@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your email/i)).toBeInTheDocument(),
    );
  });
});

describe('ForgotPasswordPage — error flow', () => {
  it('stays on form and does not show confirmation on 5xx error', async () => {
    mockForgotPassword.mockRejectedValue({
      response: { status: 500, data: { message: 'Internal server error' } },
    });
    render(<ForgotPasswordPage />);

    // The source's <label>Email</label> has no htmlFor — query by role instead
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(mockForgotPassword).toHaveBeenCalled(),
    );
    // Confirmation screen must NOT appear
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
    // Form is still present (label has no htmlFor — query by textbox role)
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('stays on form on network error (no response)', async () => {
    mockForgotPassword.mockRejectedValue(new Error('Network error'));
    render(<ForgotPasswordPage />);

    // The source's <label>Email</label> has no htmlFor — query by role instead
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalled());
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });
});
