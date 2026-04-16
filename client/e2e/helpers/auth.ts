import { type Page } from '@playwright/test';

const TEST_USER = {
  email: 'test@turassist.com',
  password: 'Test1234!',
} as const;

/**
 * Logs in via the /login form.
 * Waits for redirect to dashboard before returning.
 */
export async function login(
  page: Page,
  credentials: { email: string; password: string } = TEST_USER,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-?posta|email/i).fill(credentials.email);
  await page.getByLabel(/şifre|parola|password/i).fill(credentials.password);
  await page.getByRole('button', { name: /giriş|login|oturum/i }).click();
  await page.waitForURL('/', { timeout: 10_000 });
}
