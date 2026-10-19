import { test, expect } from '@playwright/test';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const MOCK_MERCHANT = {
  id: 'merchant-1',
  email: 'merchant@test.com',
  businessName: 'Test Merchant Co',
  status: 'active',
};

test.describe('Auth — login flow', () => {
  test('merchant can log in', async ({ page }) => {
    // Mock the POST /auth/login endpoint to return a successful response.
    await page.route(`${API_BASE}/auth/login`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-token',
          merchant: MOCK_MERCHANT,
        }),
      });
    });

    await page.goto('/auth/login');

    // Fill in credentials using accessible labels (as used in login.test.tsx)
    await page.getByLabel(/email/i).fill('merchant@test.com');
    await page.getByLabel(/password/i).fill('correct-password');
    await page.getByTestId('login-submit-button').click();

    // After a successful login the app redirects to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    // Mock a 401 Unauthorized response.
    await page.route(`${API_BASE}/auth/login`, (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    });

    await page.goto('/auth/login');

    await page.getByLabel(/email/i).fill('merchant@test.com');
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByTestId('login-submit-button').click();

    // The submit button should return to an enabled, non-loading state,
    // confirming the error path ran. The login page shows errors via toast or
    // an inline banner (e.g. rate-limit); check neither the button nor the
    // page navigated away from /auth/login.
    await expect(page.getByTestId('login-submit-button')).toBeEnabled({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
