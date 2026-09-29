import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebhooksPage from '@/app/dashboard/webhooks/page';
import { webhooksApi } from '@/lib/api';
import { WEBHOOK_EVENTS } from '@/lib/utils';

vi.mock('@/lib/api', () => ({
  webhooksApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    rotateSecret: vi.fn(),
  },
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

describe('WebhooksPage (#405)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webhooksApi.list).mockResolvedValue({
      data: [
        {
          id: 'wh_1',
          url: 'https://example.com/webhook',
          events: ['payment.created'],
          secret: 'whsec_testsecret123456',
          createdAt: '2026-09-25T10:00:00Z',
        },
      ],
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders webhooks list from API', async () => {
    render(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
      expect(screen.getByText('payment.created')).toBeInTheDocument();
    });
  });

  it('opens create modal when Add Webhook is clicked', async () => {
    render(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('new-webhook-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Endpoint URL/i)).toBeInTheDocument();
  });

  it('shows error toast and inline error message when submitted with no events selected (#405)', async () => {
    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });

    // Initially no error is rendered
    expect(screen.queryByTestId('webhook-events-error')).not.toBeInTheDocument();

    const submitBtn = screen.getByTestId('webhook-submit-button');
    fireEvent.click(submitBtn);

    // Assert toast error and inline error banner are both active
    expect(mockToastError).toHaveBeenCalledWith('Select at least one event', expect.anything());
    const inlineError = screen.getByTestId('webhook-events-error');
    expect(inlineError).toBeInTheDocument();
    expect(inlineError).toHaveTextContent('Select at least one event');
    expect(webhooksApi.create).not.toHaveBeenCalled();
  });

  it('clears inline error immediately when user checks an event checkbox (#405)', async () => {
    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });

    // Trigger validation error
    fireEvent.click(screen.getByTestId('webhook-submit-button'));
    expect(screen.getByTestId('webhook-events-error')).toBeInTheDocument();

    // Check the first event checkbox (e.g. payment.created)
    const eventCheckbox = screen.getByLabelText(/payment\.created/i);
    fireEvent.click(eventCheckbox);

    // Verify formError is cleared immediately on event check
    expect(screen.queryByTestId('webhook-events-error')).not.toBeInTheDocument();
  });

  it('successfully creates webhook when URL and event are provided', async () => {
    vi.mocked(webhooksApi.create).mockResolvedValueOnce({
      data: {
        id: 'wh_2',
        url: 'https://myapi.com/callback',
        events: ['payment.created'],
        secret: 'whsec_generated987',
        createdAt: '2026-09-25T11:00:00Z',
      },
    } as any);

    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });
    fireEvent.click(screen.getByLabelText(/payment\.created/i));

    fireEvent.click(screen.getByTestId('webhook-submit-button'));

    await waitFor(() => {
      expect(webhooksApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://myapi.com/callback',
          events: ['payment.created'],
        }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Webhook created', expect.anything());
    });
  });

  it('resets formError when modal is closed (#405)', async () => {
    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });
    fireEvent.click(screen.getByTestId('webhook-submit-button'));
    expect(screen.getByTestId('webhook-events-error')).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);

    // Reopen modal and verify error is gone
    fireEvent.click(screen.getByTestId('new-webhook-button'));
    expect(screen.queryByTestId('webhook-events-error')).not.toBeInTheDocument();
  });

  it('renders each webhook secret row inside the memoized WebhookRow (#345)', async () => {
    render(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('webhook-row-wh_1')).toBeInTheDocument();
    });

    // The row is the single source of markup: the signing secret block lives
    // inside it, so it is not duplicated alongside the list.
    const row = screen.getByTestId('webhook-row-wh_1');
    expect(row.querySelector('[data-testid="reveal-secret-wh_1"]')).not.toBeNull();
    expect(screen.getAllByTestId('reveal-secret-wh_1')).toHaveLength(1);
  });

  it('re-renders rows with the rotated secret through the WebhookRow callback (#345)', async () => {
    const rotatedSecret = 'whsec_rotated_12345678';
    vi.mocked(webhooksApi.rotateSecret).mockResolvedValueOnce({
      data: { secret: rotatedSecret },
    } as any);

    render(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('reveal-secret-wh_1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('rotate-secret-wh_1'));

    await waitFor(() => {
      expect(webhooksApi.rotateSecret).toHaveBeenCalledWith('wh_1');
      expect(screen.getByText(rotatedSecret)).toBeInTheDocument();
    });
  });
});

describe('WebhooksPage — signing secret masking (#346)', () => {
  const openCreateModal = () => {
    render(<WebhooksPage />);
    fireEvent.click(screen.getByTestId('new-webhook-button'));
  };

  it('masks the signing secret input by default', () => {
    openCreateModal();
    expect(screen.getByTestId('webhook-secret-input')).toHaveAttribute('type', 'password');
  });

  it('reveals and re-hides the secret via the toggle button', () => {
    openCreateModal();
    const input = screen.getByTestId('webhook-secret-input');
    const toggle = screen.getByTestId('toggle-webhook-secret');

    expect(toggle).toHaveAccessibleName('Show signing secret');

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAccessibleName('Hide signing secret');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAccessibleName('Show signing secret');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('still submits the typed secret value when masked', () => {
    openCreateModal();
    const input = screen.getByTestId('webhook-secret-input');
    fireEvent.change(input, { target: { value: 'mycustomsecret' } });

    // Masking is presentation-only — the controlled value is untouched.
    expect((input as HTMLInputElement).value).toBe('mycustomsecret');
  });
});

describe('WebhooksPage — events checkbox grouping (#347)', () => {
  const openCreateModal = () => {
    render(<WebhooksPage />);
    fireEvent.click(screen.getByTestId('new-webhook-button'));
  };

  it('groups the event checkboxes in a fieldset with an "Events" legend', () => {
    openCreateModal();
    const fieldset = screen.getByTestId('webhook-events-fieldset');
    expect(fieldset.tagName).toBe('FIELDSET');
    expect(fieldset.querySelector('legend')?.textContent).toBe('Events');
  });

  it('exposes the checkbox group as a named group of the expected size', () => {
    openCreateModal();
    const group = screen.getByRole('group', { name: 'Events' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(WEBHOOK_EVENTS.length);
  });

  it('keeps the event checkboxes individually labelled and togglable', () => {
    openCreateModal();
    const checkbox = screen.getByRole('checkbox', { name: 'payment.created' });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('nests the events fieldset inside the submission-disabling fieldset', () => {
    openCreateModal();
    const outer = screen.getByTestId('webhook-submit-button').closest('fieldset');
    expect(outer).not.toBeNull();
    expect(outer?.contains(screen.getByTestId('webhook-events-fieldset'))).toBe(true);
  });
});
