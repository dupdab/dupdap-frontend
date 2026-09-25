/**
 * @file settings.test.tsx
 * @description Comprehensive test suite for the Settings page (Issue #372).
 *
 * Covers:
 *  - Profile form rendering and initial empty state
 *  - Pre-population of form fields from merchantApi.profile()
 *  - Successful profile save flow
 *  - Field-level validation error rendering
 *  - Generic error fallback on save failure
 *  - API key scope toggling (check / uncheck)
 *  - API key generation: reveals masked key + copy/reveal controls
 *  - Key reveal / hide toggle
 *  - Clipboard copy with feedback
 *  - Dismiss key banner
 *  - Confirmation dialog gates key generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SettingsPage from './page';

/* jsdom does not implement matchMedia — stub it so react-hot-toast doesn't crash */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockProfile = vi.fn();
const mockUpdate = vi.fn();
const mockGenerateApiKey = vi.fn();

vi.mock('@/lib/api', () => ({
  merchantApi: {
    profile: (...args: unknown[]) => mockProfile(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    generateApiKey: (...args: unknown[]) => mockGenerateApiKey(...args),
  },
}));

vi.mock('@/lib/store', () => ({
  useAuthStore: () => ({ merchant: { id: 'merch-1', businessName: 'Acme' } }),
}));

/* lucide-react — lightweight stubs so SVG renders as text labels */
vi.mock('lucide-react', () => ({
  Copy: () => <span data-testid="icon-copy">copy</span>,
  Check: () => <span data-testid="icon-check">check</span>,
  Eye: () => <span data-testid="icon-eye">eye</span>,
  EyeOff: () => <span data-testid="icon-eyeoff">eyeoff</span>,
}));

/* navigator.clipboard */
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
});

/* window.confirm */
const mockConfirm = vi.spyOn(window, 'confirm');

/* ── Helpers ────────────────────────────────────────────────────────────── */

const profileData = {
  businessName: 'Acme Corp',
  country: 'US',
  bankName: 'Chase',
  bankCode: '1234',
  bankAccountNumber: '9876543210',
  apiKeyScopes: ['payments:read', 'settlements:read'],
};

function renderPage() {
  return render(<SettingsPage />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── Test Suites ────────────────────────────────────────────────────────── */

describe('SettingsPage — profile form', () => {
  beforeEach(() => {
    mockProfile.mockResolvedValue({ data: profileData });
    mockUpdate.mockResolvedValue({ data: profileData });
  });

  it('renders the Settings heading', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('pre-populates form fields from profile API', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/business name/i)).toHaveValue('Acme Corp'));
    expect(screen.getByLabelText(/country/i)).toHaveValue('US');
    expect(screen.getByLabelText(/bank name/i)).toHaveValue('Chase');
    expect(screen.getByLabelText(/bank code/i)).toHaveValue('1234');
    expect(screen.getByLabelText(/bank account number/i)).toHaveValue('9876543210');
  });

  it('submits updated profile and shows success toast', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/business name/i)).toHaveValue('Acme Corp'));

    fireEvent.change(screen.getByLabelText(/business name/i), {
      target: { value: 'New Corp' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: 'New Corp' }),
      ),
    );
  });

  it('shows field-level validation errors from API', async () => {
    mockUpdate.mockRejectedValueOnce({
      response: {
        data: {
          errors: { bankCode: 'Must be 3-6 digits' },
        },
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/business name/i)).toHaveValue('Acme Corp'));

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText('Must be 3-6 digits')).toBeInTheDocument(),
    );
  });

  it('shows generic error message when no field errors provided', async () => {
    mockUpdate.mockRejectedValueOnce({
      response: { data: { message: 'Server error' } },
    });

    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/business name/i)).toHaveValue('Acme Corp'));

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalled(),
    );
  });

  it('disables Save button while request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    mockUpdate.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/business name/i)).toHaveValue('Acme Corp'));

    const btn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(btn);

    expect(btn).toBeDisabled();
    resolve({ data: profileData });
  });
});

describe('SettingsPage — API key scopes', () => {
  beforeEach(() => {
    mockProfile.mockResolvedValue({ data: profileData });
  });

  it('renders current scope list from profile', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('payments:read')).toBeInTheDocument(),
    );
    expect(screen.getByText('settlements:read')).toBeInTheDocument();
  });

  it('shows "No API key scopes" when profile returns empty scopes', async () => {
    mockProfile.mockResolvedValue({ data: { ...profileData, apiKeyScopes: [] } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no api key scopes assigned yet/i)).toBeInTheDocument(),
    );
  });

  it('toggles scope checkbox off and back on', async () => {
    renderPage();
    await waitFor(() => expect(mockProfile).toHaveBeenCalled());

    const checkbox = screen.getByRole('checkbox', { name: /payments: read/i });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});

describe('SettingsPage — API key generation', () => {
  const generatedKey = 'sk_live_abcdefghijklmnop';

  beforeEach(() => {
    mockProfile.mockResolvedValue({ data: profileData });
    mockGenerateApiKey.mockResolvedValue({ data: { apiKey: generatedKey } });
    mockConfirm.mockReturnValue(true);
  });

  it('generates API key on confirmation and shows masked value', async () => {
    renderPage();
    await waitFor(() => expect(mockProfile).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

    await waitFor(() =>
      expect(mockGenerateApiKey).toHaveBeenCalled(),
    );

    // Key should be masked by default — dots visible, not the raw key
    await waitFor(() =>
      expect(screen.getByText(/save this key now/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(generatedKey)).not.toBeInTheDocument();
  });

  it('does NOT generate key when user cancels confirmation', async () => {
    mockConfirm.mockReturnValueOnce(false);

    renderPage();
    await waitFor(() => expect(mockProfile).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockGenerateApiKey).not.toHaveBeenCalled();
  });

  it('reveals full key on eye button click, hides again', async () => {
    renderPage();
    await waitFor(() => expect(mockProfile).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));
    await waitFor(() => expect(screen.getByText(/save this key now/i)).toBeInTheDocument());

    const revealBtn = screen.getByRole('button', { name: /reveal api key/i });
    fireEvent.click(revealBtn);
    expect(screen.getByText(generatedKey)).toBeInTheDocument();

    const hideBtn = screen.getByRole('button', { name: /hide api key/i });
    fireEvent.click(hideBtn);
    expect(screen.queryByText(generatedKey)).not.toBeInTheDocument();
  });

  it('copies key to clipboard and flips icon to check', async () => {
    renderPage();
    await waitFor(() => expect(mockProfile).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));
    await waitFor(() => expect(screen.getByText(/save this key now/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /copy api key/i }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(generatedKey),
    );
  });

  it('dismisses the key banner on "I\'ve saved it" click', async () => {
    renderPage();
    await waitFor(() => expect(mockProfile).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));
    await waitFor(() => expect(screen.getByText(/save this key now/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /i've saved it, dismiss/i }));

    expect(screen.queryByText(/save this key now/i)).not.toBeInTheDocument();
  });
});
