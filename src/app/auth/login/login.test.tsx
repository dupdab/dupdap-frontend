import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

// next/link — render as a plain <a> so tests can assert on the link text
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

// react-hot-toast
const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...args: unknown[]) => mockToastError(...args) },
}));

// authApi
const mockLogin = vi.fn();
vi.mock('@/lib/api', () => ({
  authApi: { login: (...args: unknown[]) => mockLogin(...args) },
}));

// useAuthStore
const mockSetAuth = vi.fn();
vi.mock('@/lib/store', () => ({
  useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

// ── Static import ─────────────────────────────────────────────────────────────
import LoginPage from '@/app/auth/login/page';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fillAndSubmit(email = 'merchant@test.com', password = 'secret') {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByTestId('login-submit-button'));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the sign-in form', () => {
    render(React.createElement(LoginPage));
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-button')).toBeInTheDocument();
  });

  // ── Successful login ─────────────────────────────────────────────────────

  it('calls authApi.login with form values on submit', async () => {
    mockLogin.mockResolvedValueOnce({
      data: { accessToken: 'tok', merchant: { id: '1', email: 'merchant@test.com', businessName: 'Acme', status: 'active' } },
    });

    render(React.createElement(LoginPage));
    await fillAndSubmit('merchant@test.com', 'secret');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'merchant@test.com', password: 'secret' });
    });
  });

  it('calls setAuth with the token and merchant on success', async () => {
    const merchant = { id: '1', email: 'merchant@test.com', businessName: 'Acme', status: 'active' };
    mockLogin.mockResolvedValueOnce({ data: { accessToken: 'tok123', merchant } });

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith('tok123', merchant);
    });
  });

  it('navigates to /dashboard after a successful login', async () => {
    const merchant = { id: '1', email: 'merchant@test.com', businessName: 'Acme', status: 'active' };
    mockLogin.mockResolvedValueOnce({ data: { accessToken: 'tok', merchant } });

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it('disables the submit button and shows "Signing in…" while loading', async () => {
    // Never resolves during the test so we can inspect mid-flight state.
    mockLogin.mockReturnValueOnce(new Promise(() => {}));

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    const btn = screen.getByTestId('login-submit-button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/signing in/i);
  });

  it('re-enables the submit button after a successful login', async () => {
    const merchant = { id: '1', email: 'm@b.com', businessName: 'B', status: 'active' };
    mockLogin.mockResolvedValueOnce({ data: { accessToken: 'tok', merchant } });

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByTestId('login-submit-button')).not.toBeDisabled();
    });
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it('shows a toast with the server error message on API failure', async () => {
    const axiosError = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      { data: { message: 'Invalid credentials' }, status: 401, statusText: 'Unauthorized', headers: {}, config: {} as never },
    );
    mockLogin.mockRejectedValueOnce(axiosError);

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/invalid credentials/i));
    });
  });

  it('falls back to "Login failed" when the error carries no message', async () => {
    mockLogin.mockRejectedValueOnce(new Error());

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Login failed');
    });
  });

  it('re-enables the submit button after a failed login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('bad'));

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByTestId('login-submit-button')).not.toBeDisabled();
    });
  });

  it('does not call setAuth or router.push on failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('bad'));

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── ?next= redirect ───────────────────────────────────────────────────────

  it('navigates to /dashboard when no ?next param is present', async () => {
    const merchant = { id: '1', email: 'm@b.com', businessName: 'B', status: 'active' };
    mockLogin.mockResolvedValueOnce({ data: { accessToken: 'tok', merchant } });

    render(React.createElement(LoginPage));
    await fillAndSubmit();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });
});
