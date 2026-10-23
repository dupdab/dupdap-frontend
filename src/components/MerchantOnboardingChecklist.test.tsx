import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MerchantOnboardingChecklist } from './MerchantOnboardingChecklist';

vi.mock('@/lib/api', () => ({
  merchantApi: {
    profile: vi.fn().mockResolvedValue({
      data: { businessName: 'Acme', bankAccountNumber: '1234567890' },
    }),
  },
  webhooksApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 'webhook-1' }] }),
  },
}));

function renderChecklist(paymentCount: number) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MerchantOnboardingChecklist
        paymentCount={paymentCount}
        merchantId="merchant-test"
      />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('MerchantOnboardingChecklist', () => {
  it('shows the four linked setup steps for merchants with no payments', async () => {
    renderChecklist(0);

    expect(
      await screen.findByTestId('onboarding-checklist')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /complete your profile/i })
    ).toHaveAttribute('href', '/dashboard/settings');
    expect(
      screen.getByRole('link', { name: /add a bank account/i })
    ).toHaveAttribute('href', '/dashboard/settings#bank-account');
    expect(
      screen.getByRole('link', { name: /create your first payment/i })
    ).toHaveAttribute('href', '/dashboard/payments');
    expect(
      screen.getByRole('link', { name: /add a webhook/i })
    ).toHaveAttribute('href', '/dashboard/webhooks');
    await waitFor(() =>
      expect(screen.getByText('3 of 4 steps complete')).toBeInTheDocument()
    );
    expect(localStorage.getItem('dupdub-onboarding-merchant-test')).toContain(
      '"profile"'
    );
    expect(
      screen.queryByRole('button', { name: /dismiss onboarding/i })
    ).not.toBeInTheDocument();
  });

  it('allows dismissal after all steps are complete and remembers progress', async () => {
    const view = renderChecklist(0);
    await waitFor(() =>
      expect(screen.getByText('3 of 4 steps complete')).toBeInTheDocument()
    );
    view.rerender(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MerchantOnboardingChecklist
          paymentCount={1}
          merchantId="merchant-test"
        />
      </QueryClientProvider>
    );

    const dismissButton = await screen.findByRole('button', {
      name: /dismiss onboarding checklist/i,
    });
    fireEvent.click(dismissButton);
    await waitFor(() =>
      expect(
        screen.queryByTestId('onboarding-checklist')
      ).not.toBeInTheDocument()
    );
    expect(localStorage.getItem('dupdub-onboarding-merchant-test')).toContain(
      '"dismissed":true'
    );
  });
});
