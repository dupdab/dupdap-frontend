/**
 * @file page.test.tsx
 * @description Comprehensive test suite for the Webhooks dashboard page (Issue #373).
 *
 * Covers:
 *  - Initial render & empty state ("No webhooks configured")
 *  - Webhook list rendering (URL, event tags, formatted date)
 *  - Modal open/close lifecycle
 *  - Webhook creation validation (requires at least one event selected)
 *  - Successful webhook creation flow (calls webhooksApi.create, resets form, closes modal)
 *  - WebhookSecretRow: masking, reveal/hide toggle, clipboard copy, secret rotation
 *  - Delete flow via ConfirmDialog: cancellation leaves webhook intact, confirmation calls webhooksApi.remove and refreshes list
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import toast from 'react-hot-toast';
import WebhooksPage from './page';

/* ── Mocks ──────────────────────────────────────────────────────────────── */

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRotateSecret = vi.fn();
const mockRemove = vi.fn();

vi.mock('@/lib/api', () => ({
  webhooksApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    rotateSecret: (...args: unknown[]) => mockRotateSecret(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/utils', () => ({
  WEBHOOK_EVENTS: ['payment.created', 'payment.completed', 'payment.failed'],
  formatDate: (s: string) => s.slice(0, 10),
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

/* navigator.clipboard mock */
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
});

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const fixtureWebhooks = [
  {
    id: 'wh-1',
    url: 'https://example.com/webhook-1',
    events: ['payment.created', 'payment.completed'],
    secret: 'whsec_secret1234567890abcdef',
    createdAt: '2024-01-15T12:00:00Z',
  },
  {
    id: 'wh-2',
    url: 'https://example.com/webhook-2',
    events: ['payment.failed'],
    secret: 'whsec_anothersecret9999',
    createdAt: '2024-02-20T15:30:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ data: fixtureWebhooks });
});

afterEach(() => {
  cleanup();
});

/* ── Test Suites ────────────────────────────────────────────────────────── */

describe('WebhooksPage — rendering & list state', () => {
  it('renders heading and Add Webhook button', async () => {
    render(<WebhooksPage />);
    expect(screen.getByRole('heading', { name: /webhooks/i })).toBeInTheDocument();
    expect(screen.getByTestId('new-webhook-button')).toBeInTheDocument();
    await waitFor(() => expect(mockList).toHaveBeenCalledOnce());
  });

  it('renders list of webhooks with URLs and event badges', async () => {
    render(<WebhooksPage />);
    await waitFor(() => {
      expect(screen.getByText('https://example.com/webhook-1')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/webhook-2')).toBeInTheDocument();
    });

    expect(screen.getByText('payment.created')).toBeInTheDocument();
    expect(screen.getByText('payment.completed')).toBeInTheDocument();
    expect(screen.getByText('payment.failed')).toBeInTheDocument();
  });

  it('renders empty state when no webhooks are configured', async () => {
    mockList.mockResolvedValueOnce({ data: [] });
    render(<WebhooksPage />);
    await waitFor(() => {
      expect(screen.getByText(/no webhooks configured/i)).toBeInTheDocument();
    });
  });
});

describe('WebhooksPage — webhook creation flow', () => {
  it('opens create modal on clicking Add Webhook button', async () => {
    render(<WebhooksPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('new-webhook-button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
  });

  it('prevents submission and alerts error when no events are selected', async () => {
    render(<WebhooksPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    fireEvent.change(screen.getByLabelText(/endpoint url/i), {
      target: { value: 'https://myserver.com/hook' },
    });

    fireEvent.click(screen.getByTestId('webhook-submit-button'));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Select at least one event');
  });

  it('successfully creates a webhook when endpoint and events are provided', async () => {
    const createdWebhook = {
      id: 'wh-new',
      url: 'https://myserver.com/hook',
      events: ['payment.created'],
      secret: 'whsec_generated1234',
      createdAt: '2024-03-01T00:00:00Z',
    };
    mockCreate.mockResolvedValueOnce({ data: createdWebhook });

    render(<WebhooksPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    fireEvent.change(screen.getByLabelText(/endpoint url/i), {
      target: { value: 'https://myserver.com/hook' },
    });

    // Check payment.created
    const eventCheckbox = screen.getByLabelText('payment.created');
    fireEvent.click(eventCheckbox);

    // Enter optional secret
    fireEvent.change(screen.getByTestId('webhook-secret-input'), {
      target: { value: 'mycustomsecret' },
    });

    fireEvent.click(screen.getByTestId('webhook-submit-button'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        url: 'https://myserver.com/hook',
        events: ['payment.created'],
        secret: 'mycustomsecret',
      });
      expect(toast.success).toHaveBeenCalledWith('Webhook created');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('WebhooksPage — WebhookSecretRow interactions', () => {
  it('masks secret by default and toggles reveal on eye button click', async () => {
    render(<WebhooksPage />);
    await waitFor(() => expect(screen.getByText('https://example.com/webhook-1')).toBeInTheDocument());

    const rawSecret = 'whsec_secret1234567890abcdef';
    // Raw secret should NOT be shown initially (masked)
    expect(screen.queryByText(rawSecret)).toBeNull();

    // Click reveal button
    const revealBtn = screen.getByTestId('reveal-secret-wh-1');
    fireEvent.click(revealBtn);

    // Now full secret is revealed
    expect(screen.getByText(rawSecret)).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(revealBtn);
    expect(screen.queryByText(rawSecret)).toBeNull();
  });

  it('copies signing secret to clipboard on click', async () => {
    render(<WebhooksPage />);
    await waitFor(() => expect(screen.getByText('https://example.com/webhook-1')).toBeInTheDocument());

    const copyBtn = screen.getByTestId('copy-secret-wh-1');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('whsec_secret1234567890abcdef');
    });
  });

  it('rotates signing secret and updates revealed value upon success', async () => {
    const rotatedSecret = 'whsec_rotated_99999999';
    mockRotateSecret.mockResolvedValueOnce({ data: { secret: rotatedSecret } });

    render(<WebhooksPage />);
    await waitFor(() => expect(screen.getByText('https://example.com/webhook-1')).toBeInTheDocument());

    const rotateBtn = screen.getByTestId('rotate-secret-wh-1');
    fireEvent.click(rotateBtn);

    await waitFor(() => {
      expect(mockRotateSecret).toHaveBeenCalledWith('wh-1');
      expect(toast.success).toHaveBeenCalledWith('Signing secret rotated');
      expect(screen.getByText(rotatedSecret)).toBeInTheDocument();
    });
  });
});

describe('WebhooksPage — delete confirmation flow', () => {
  it('cancels deletion when user clicks cancel in confirmation dialog', async () => {
    render(<WebhooksPage />);
    await waitFor(() => expect(screen.getByText('https://example.com/webhook-1')).toBeInTheDocument());

    // Click trash button on wh-1
    fireEvent.click(screen.getByTestId('delete-webhook-wh-1'));

    // ConfirmDialog opens
    expect(screen.getByText('Delete webhook?')).toBeInTheDocument();

    // Click cancel button
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByText('Delete webhook?')).not.toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('confirms deletion, calls webhooksApi.remove, and reloads list', async () => {
    mockRemove.mockResolvedValueOnce({});

    render(<WebhooksPage />);
    await waitFor(() => expect(screen.getByText('https://example.com/webhook-1')).toBeInTheDocument());

    // Click trash button on wh-1
    fireEvent.click(screen.getByTestId('delete-webhook-wh-1'));

    expect(screen.getByText('Delete webhook?')).toBeInTheDocument();

    // Click Delete confirmation button
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith('wh-1');
      expect(toast.success).toHaveBeenCalledWith('Webhook removed');
      // Verify reload is triggered
      expect(mockList).toHaveBeenCalledTimes(2);
    });
  });
});
