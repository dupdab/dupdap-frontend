/**
 * E2E tests for the create-payment → share-link flow.
 *
 * Covers:
 *   login → navigate to /dashboard/payments
 *   → click "New Payment" → fill form → submit
 *   → QR modal opens with payment link → copy link
 */

import { test, expect, type Page } from '@playwright/test';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const MOCK_MERCHANT = {
  id: 'merchant-1',
  email: 'merchant@test.com',
  businessName: 'Test Merchant Co',
  status: 'active',
};

const MOCK_PAYMENT = {
  id: 'pay-001',
  reference: 'REF-E2E-001',
  amountUsd: 50,
  status: 'pending',
  stellarMemo: 'MEMO-E2E',
  stellarDepositAddress: 'GABCDEFGHIJKLMNOP1234567890ABCDEFGHIJKLMNOP12345',
  qrCode: 'web+stellar:pay?destination=GABCDEF&amount=50&memo=MEMO-E2E&memo_type=text',
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Log in via the UI (mocking the API), wait for redirect to /dashboard.
 */
async function loginAs(page: Page) {
  await page.route(`${API_BASE}/auth/login`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-jwt', merchant: MOCK_MERCHANT }),
    });
  });

  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill('merchant@test.com');
  await page.getByLabel(/password/i).fill('correct-password');
  await page.getByTestId('login-submit-button').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Create payment flow', () => {
  test('merchant can create a payment and see the QR modal', async ({ page }) => {
    // Mock the dashboard payments list (empty) and create endpoint.
    await page.route(`${API_BASE}/payments*`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ payments: [], total: 0 }),
        });
      } else {
        // POST — return the newly created payment.
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PAYMENT),
        });
      }
    });

    await loginAs(page);

    // Navigate to the payments page.
    await page.goto('/dashboard/payments');

    // Open the "New Payment" modal.
    await page.getByTestId('new-payment-button').click();
    const createModal = page.getByTestId('create-payment-modal');
    await expect(createModal).toBeVisible();

    // Fill in the form.
    await createModal.getByLabel(/amount.*usd/i).fill('50');
    await createModal.getByLabel(/description/i).fill('E2E test invoice');
    await createModal.getByTestId('create-payment-submit').click();

    // The create modal should close and the QR modal should open.
    await expect(createModal).not.toBeVisible({ timeout: 8_000 });
    const qrModal = page.getByTestId('payment-qr-modal');
    await expect(qrModal).toBeVisible({ timeout: 8_000 });

    // The QR modal should display the payment reference.
    await expect(qrModal.getByText('REF-E2E-001')).toBeVisible();
  });

  test('QR modal shows payment link and copy button', async ({ page }) => {
    await page.route(`${API_BASE}/payments*`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ payments: [], total: 0 }),
        });
      } else {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PAYMENT),
        });
      }
    });

    await loginAs(page);
    await page.goto('/dashboard/payments');

    await page.getByTestId('new-payment-button').click();
    const createModal = page.getByTestId('create-payment-modal');
    await createModal.getByLabel(/amount.*usd/i).fill('50');
    await createModal.getByTestId('create-payment-submit').click();

    const qrModal = page.getByTestId('payment-qr-modal');
    await expect(qrModal).toBeVisible({ timeout: 8_000 });

    // The shareable payment link (/pay/<reference>) should be visible.
    await expect(qrModal.getByText(`/pay/${MOCK_PAYMENT.reference}`)).toBeVisible();

    // The "Copy payment link" button should be present and accessible.
    const copyLinkBtn = qrModal.getByLabel(/copy payment link/i);
    await expect(copyLinkBtn).toBeVisible();
  });
});

test.describe('Share payment link flow', () => {
  test('copying the payment link writes the correct URL to the clipboard', async ({ page, context }) => {
    // Grant clipboard permissions so we can read back what was written.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.route(`${API_BASE}/payments*`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ payments: [], total: 0 }),
        });
      } else {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PAYMENT),
        });
      }
    });

    await loginAs(page);
    await page.goto('/dashboard/payments');

    // Create a payment to get to the QR modal.
    await page.getByTestId('new-payment-button').click();
    const createModal = page.getByTestId('create-payment-modal');
    await createModal.getByLabel(/amount.*usd/i).fill('50');
    await createModal.getByTestId('create-payment-submit').click();

    const qrModal = page.getByTestId('payment-qr-modal');
    await expect(qrModal).toBeVisible({ timeout: 8_000 });

    // Click the copy link button.
    const copyLinkBtn = qrModal.getByLabel(/copy payment link/i);
    await copyLinkBtn.click();

    // Verify the clipboard contains the expected URL.
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(`/pay/${MOCK_PAYMENT.reference}`);
  });

  test('payment link navigates to the customer pay page', async ({ page }) => {
    const paymentId = MOCK_PAYMENT.reference;

    // Mock the public pay endpoint that the customer pay page polls.
    await page.route(`${API_BASE}/pay/${paymentId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PAYMENT),
      });
    });

    // Navigate directly to the share link as a customer would.
    await page.goto(`/pay/${paymentId}`);

    // The pay page should render the payment amount.
    await expect(page.getByText('$50.00')).toBeVisible({ timeout: 10_000 });

    // The deposit address should be visible.
    await expect(page.getByText(MOCK_PAYMENT.stellarDepositAddress)).toBeVisible();
  });
});
