import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...args: unknown[]) => mockToastError(...args) },
}));

const mockRegister = vi.fn();
vi.mock('@/lib/api', () => ({
  authApi: { register: (...args: unknown[]) => mockRegister(...args) },
}));

const mockSetAuth = vi.fn();
vi.mock('@/lib/store', () => ({
  useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

// ── Static import (avoids duplicate-render caused by dynamic re-import) ───────
import RegisterPage from '@/app/auth/register/page';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * The RegisterPage field() helper renders <label> + <input> without a htmlFor
 * association. Use getByRole('textbox'/'combobox') or nth-index queries.
 *
 * Form field order: businessName [0], email [1], password* [0], confirm* [1]
 * password inputs are role="textbox" is NOT valid for type="password"; use
 * getAllByRole for inputs that have an accessible role, otherwise select by index
 * within the form.
 */
function getInputs() {
  // There are exactly 2 textbox inputs (businessName, email) and 2 password inputs.
  const textboxes = screen.getAllByRole('textbox'); // businessName, email
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  return {
    businessName: textboxes[0],
    email: textboxes[1],
    password: passwordInputs[0] as HTMLInputElement,
    confirmPassword: passwordInputs[1] as HTMLInputElement,
  };
}

async function fillForm({
  businessName = 'Acme Corp',
  email = 'merchant@test.com',
  password = 'Secret1!',
  confirmPassword,
}: {
  businessName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
} = {}) {
  const confirm = confirmPassword ?? password;
  const inputs = getInputs();
  await userEvent.type(inputs.businessName, businessName);
  await userEvent.type(inputs.email, email);
  await userEvent.type(inputs.password, password);
  await userEvent.type(inputs.confirmPassword, confirm);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders all required form fields', () => {
    render(React.createElement(RegisterPage));
    const textboxes = screen.getAllByRole('textbox');
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(textboxes.length).toBeGreaterThanOrEqual(2); // businessName + email
    expect(passwordInputs.length).toBe(2);              // password + confirmPassword
    expect(screen.getByTestId('register-submit-button')).toBeInTheDocument();
  });

  it('renders a country select field (optional)', () => {
    render(React.createElement(RegisterPage));
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    // The country select contains the "Select a country" placeholder option
    const countrySelect = selects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some((o) => /select a country/i.test(o.text))
    );
    expect(countrySelect).toBeDefined();
  });

  it('renders a link to the login page', () => {
    render(React.createElement(RegisterPage));
    const links = screen.getAllByRole('link', { name: /sign in/i });
    expect(links[0]).toHaveAttribute('href', '/auth/login');
  });

  // ── Controlled-input (field helper) ──────────────────────────────────────

  it('reflects typed value in the Business Name input', async () => {
    render(React.createElement(RegisterPage));
    const input = getInputs().businessName;
    await userEvent.type(input, 'My Shop');
    expect(input).toHaveValue('My Shop');
  });

  it('reflects typed value in the Email input', async () => {
    render(React.createElement(RegisterPage));
    const input = getInputs().email;
    await userEvent.type(input, 'a@b.com');
    expect(input).toHaveValue('a@b.com');
  });

  it('reflects typed value in the Password input', async () => {
    render(React.createElement(RegisterPage));
    const input = getInputs().password;
    await userEvent.type(input, 'Secret1!');
    expect(input).toHaveValue('Secret1!');
  });

  // ── Password strength / validation ───────────────────────────────────────

  it('disables submit when password is too weak', async () => {
    render(React.createElement(RegisterPage));
    await userEvent.type(getInputs().password, 'weak');
    await userEvent.type(getInputs().confirmPassword, 'weak');
    expect(screen.getByTestId('register-submit-button')).toBeDisabled();
  });

  it('disables submit when passwords do not match', async () => {
    render(React.createElement(RegisterPage));
    await userEvent.type(getInputs().password, 'Secret1!');
    await userEvent.type(getInputs().confirmPassword, 'Different1!');
    expect(screen.getByTestId('register-submit-button')).toBeDisabled();
  });

  it('shows "Passwords do not match" error message', async () => {
    render(React.createElement(RegisterPage));
    await userEvent.type(getInputs().password, 'Secret1!');
    await userEvent.type(getInputs().confirmPassword, 'OtherPass1!');
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('enables submit when password is strong and passwords match', async () => {
    render(React.createElement(RegisterPage));
    await fillForm();
    expect(screen.getByTestId('register-submit-button')).not.toBeDisabled();
  });

  // ── Special-character requirement is enforced (issue #297) ───────────────

  it('disables submit when the password lacks a special character', async () => {
    render(React.createElement(RegisterPage));
    // Meets length/lower/upper/number but has no special character.
    await fillForm({ password: 'Secret123' });
    expect(screen.getByTestId('register-submit-button')).toBeDisabled();
  });

  it('enables submit once a special character is added', async () => {
    render(React.createElement(RegisterPage));
    await fillForm({ password: 'Secret123!' });
    expect(screen.getByTestId('register-submit-button')).not.toBeDisabled();
  });

  // ── Password requirements live region (issue #296) ───────────────────────

  it('announces password requirement progress via an aria-live region', async () => {
    render(React.createElement(RegisterPage));
    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBeGreaterThanOrEqual(1);

    await userEvent.type(getInputs().password, 'Secret1!');

    const announcement = Array.from(liveRegions).find((el) =>
      /requirements? met/i.test(el.textContent ?? '')
    );
    expect(announcement).toBeDefined();
    expect(announcement?.textContent).toMatch(/\d+ of \d+ requirements? met/i);
  });

  // ── Successful registration ───────────────────────────────────────────────

  it('calls authApi.register with form values on submit', async () => {
    const merchant = { id: '2', email: 'merchant@test.com', businessName: 'Acme Corp', status: 'active' };
    mockRegister.mockResolvedValueOnce({ data: { accessToken: 'tok', merchant } });

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'merchant@test.com', businessName: 'Acme Corp' }),
      );
    });
  });

  it('calls setAuth with token and merchant on success', async () => {
    const merchant = { id: '2', email: 'merchant@test.com', businessName: 'Acme Corp', status: 'active' };
    mockRegister.mockResolvedValueOnce({ data: { accessToken: 'abc', merchant } });

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith('abc', merchant);
    });
  });

  it('redirects to the dashboard after successful registration', async () => {
    const merchant = { id: '2', email: 'merchant@test.com', businessName: 'Acme Corp', status: 'active' };
    mockRegister.mockResolvedValueOnce({ data: { accessToken: 'abc', merchant } });

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('shows a toast error when registration fails', async () => {
    mockRegister.mockRejectedValueOnce(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
        data: { message: 'Email already in use' },
      }),
    );

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email already in use');
    });
  });
  it('falls back to "Registration failed" when no error message is present', async () => {
    mockRegister.mockRejectedValueOnce(new Error());

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Registration failed');
    });
  });

  it('re-enables the submit button after a failed registration', async () => {
    mockRegister.mockRejectedValueOnce(new Error('bad'));

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('register-submit-button')).not.toBeDisabled();
    });
  });

  it('does not call setAuth or router.push on failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('bad'));

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders persistent inline form error banner on API failure (#408)', async () => {
    const err = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      { data: { message: 'Email already registered' }, status: 409, statusText: 'Conflict', headers: {}, config: {} as never },
    );
    mockRegister.mockRejectedValueOnce(err);

    render(React.createElement(RegisterPage));
    await fillForm();

    expect(screen.queryByTestId('register-form-error')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      const banner = screen.getByTestId('register-form-error');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/email already registered/i);
    });
  });

  it('clears inline form error banner when a new submission starts (#408)', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Network error'));

    render(React.createElement(RegisterPage));
    await fillForm();
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('register-form-error')).toHaveTextContent('Network error');
    });

    // Mock next submission to hang pending
    mockRegister.mockReturnValueOnce(new Promise(() => {}));
    await userEvent.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('register-form-error')).not.toBeInTheDocument();
    });
  });

});
});
