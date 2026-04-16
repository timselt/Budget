import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Authentication', () => {
  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/e-?posta|email/i)).toBeVisible();
    await expect(page.getByLabel(/şifre|parola|password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /giriş|login|oturum/i }),
    ).toBeVisible();
  });

  // Requires running backend API at localhost:5000
  test.skip('login with valid credentials redirects to dashboard', async ({
    page,
  }) => {
    await login(page);

    await expect(page).toHaveURL('/');
    await expect(page.locator('h1, [data-testid="dashboard-title"]')).toBeVisible();
  });

  // Requires running backend API at localhost:5000
  test.skip('login with invalid credentials shows error message', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel(/e-?posta|email/i).fill('invalid@example.com');
    await page.getByLabel(/şifre|parola|password/i).fill('WrongPass123!');
    await page.getByRole('button', { name: /giriş|login|oturum/i }).click();

    await expect(
      page.getByText(/hatalı|geçersiz|invalid|incorrect/i),
    ).toBeVisible();
  });

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login/);
  });

  // Requires running backend API at localhost:5000
  test.skip('logout clears session and redirects to login', async ({
    page,
  }) => {
    await login(page);

    await page
      .getByRole('button', { name: /çıkış|logout|oturumu kapat/i })
      .click();

    await expect(page).toHaveURL(/\/login/);

    // Verify session is cleared — navigating to a protected route redirects back
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
