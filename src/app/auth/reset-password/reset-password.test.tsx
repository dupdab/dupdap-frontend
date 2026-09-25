/**
 * @file reset-password.test.tsx
 * @description Test suite for the Reset Password page (Issue #381).
 *
 * The page uses `useSearchParams()` to read the `?token=` param and
 * `useRouter()` to redirect after success. Both are mocked to control
 * the token value and capture navigation calls.
 *
 * Note: the source's <label> elements have no `htmlFor` attribute, so
 * `getByLabelText` is unavailable. Password inputs are queried by position
 * (first input = new password, second = confirm password) via
 * `container.querySelectorAll('input[type="password"]')`.
 *
 * Covers:
 *  - No-token state: renders "Invalid reset link" guard message
 *  - Form renders New Password + Confirm Password inputs when token present
 *  - Password strength checklist renders as user types
 *  - Passwords-do-not-match error shown when confirm differs
 *  - Submit button disabled when passwords don't satisfy all rules
 *  - Submit button enabled when all rules pass and passwords match
 *  - Successful reset: calls authApi.resetPassword and redirects to /auth/login
 *  - API error: does not redirect (stays on page)
 *  - "Back to sign in" link present
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ResetPasswordPage from './page';

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

const mockResetPassword = vi.fn();
const mockRouterPush = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock('@/lib/api', () => ({
  authApi: {
    resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Render the page with a valid token in search params */
function renderWithToken(token = 'valid-reset-token') {
  mockSearchParamsGet.mockReturnValue(token);
  return render(<ResetPasswordPage />);
}

/** Render the page with no token (missing ?token=) */
function renderNoToken() {
  mockSearchParamsGet.mockReturnValue(null);
  return render(<ResetPasswordPage />);
}

/**
 * Get the two password inputs from the rendered container.
 * The source labels have no htmlFor — query by type + position.
 */
function getPasswordInputs(container: HTMLElement) {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="password"]');
  return { newPw: inputs[0], confirmPw: inputs[1] };
}

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe('ResetPasswordPage — no token (invalid link)', () => {
  it('renders "Invalid reset link" guard when token is absent', async () => {
    renderNoToken();
    await waitFor(() =>
      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument(),
    );
  });

  it('does not render password inputs when token is absent', async () => {
    const { container } = renderNoToken();
    await waitFor(() =>
      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument(),
    );
    expect(container.querySelectorAll('input[type="password"]').length).toBe(0);
  });

  it('renders link to forgot-password page in the guard message', async () => {
    renderNoToken();
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /forgot password/i });
      expect(link).toHaveAttribute('href', '/auth/forgot-password');
    });
  });
});

describe('ResetPasswordPage — form rendering', () => {
  it('renders both password inputs when token is present', async () => {
    const { container } = renderWithToken();
    await waitFor(() => {
      const { newPw, confirmPw } = getPasswordInputs(container);
      expect(newPw).toBeTruthy();
      expect(confirmPw).toBeTruthy();
    });
  });

  it('renders the Update password submit button', async () => {
    renderWithToken();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument(),
    );
  });

  it('renders "Back to sign in" link', async () => {
    renderWithToken();
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /back to sign in/i });
      expect(link).toHaveAttribute('href', '/auth/login');
    });
  });
});

describe('ResetPasswordPage — password strength checklist', () => {
  it('shows strength rules as user types the password', async () => {
    const { container } = renderWithToken();
    await waitFor(() =>
      expect(getPasswordInputs(container).newPw).toBeTruthy(),
    );

    fireEvent.change(getPasswordInputs(container).newPw, {
      target: { value: 'test' },
    });

    // Rules list should be visible after typing starts
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/an uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/a lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/a number/i)).toBeInTheDocument();
  });
});

describe('ResetPasswordPage — validation', () => {
  it('shows mismatch error when confirm password differs', async () => {
    const { container } = renderWithToken();
    await waitFor(() => expect(getPasswordInputs(container).newPw).toBeTruthy());

    const { newPw, confirmPw } = getPasswordInputs(container);
    fireEvent.change(newPw, { target: { value: 'Password1' } });
    fireEvent.change(confirmPw, { target: { value: 'Different1' } });

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('submit button is disabled when password does not meet all rules', async () => {
    const { container } = renderWithToken();
    await waitFor(() => expect(getPasswordInputs(container).newPw).toBeTruthy());

    const { newPw, confirmPw } = getPasswordInputs(container);
    fireEvent.change(newPw, { target: { value: 'weak' } });
    fireEvent.change(confirmPw, { target: { value: 'weak' } });

    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();
  });

  it('submit button is enabled when all rules pass and passwords match', async () => {
    const { container } = renderWithToken();
    await waitFor(() => expect(getPasswordInputs(container).newPw).toBeTruthy());

    const { newPw, confirmPw } = getPasswordInputs(container);
    fireEvent.change(newPw, { target: { value: 'StrongPass1' } });
    fireEvent.change(confirmPw, { target: { value: 'StrongPass1' } });

    expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled();
  });
});

describe('ResetPasswordPage — submit flow', () => {
  it('calls authApi.resetPassword with token and new password on submit', async () => {
    mockResetPassword.mockResolvedValue({});
    const { container } = renderWithToken('test-token-123');
    await waitFor(() => expect(getPasswordInputs(container).newPw).toBeTruthy());

    const { newPw, confirmPw } = getPasswordInputs(container);
    fireEvent.change(newPw, { target: { value: 'StrongPass1' } });
    fireEvent.change(confirmPw, { target: { value: 'StrongPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: 'test-token-123',
        password: 'StrongPass1',
      }),
    );
  });

  it('redirects to /auth/login on successful reset', async () => {
    mockResetPassword.mockResolvedValue({});
    const { container } = renderWithToken();
    await waitFor(() => expect(getPasswordInputs(container).newPw).toBeTruthy());

    const { newPw, confirmPw } = getPasswordInputs(container);
    fireEvent.change(newPw, { target: { value: 'StrongPass1' } });
    fireEvent.change(confirmPw, { target: { value: 'StrongPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/auth/login'),
    );
  });

  it('does not redirect when API returns an error', async () => {
    mockResetPassword.mockRejectedValue({
      response: { data: { message: 'Token expired' } },
    });
    const { container } = renderWithToken();
    await waitFor(() => expect(getPasswordInputs(container).newPw).toBeTruthy());

    const { newPw, confirmPw } = getPasswordInputs(container);
    fireEvent.change(newPw, { target: { value: 'StrongPass1' } });
    fireEvent.change(confirmPw, { target: { value: 'StrongPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(mockResetPassword).toHaveBeenCalled());
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
