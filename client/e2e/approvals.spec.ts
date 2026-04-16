import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Budget Versions', () => {
  // Requires running backend API at localhost:5000
  test.skip('versions page renders version list', async ({ page }) => {
    await login(page);
    await page.goto('/budget/versions');

    await expect(page).toHaveURL('/budget/versions');

    // A table or list of budget versions should be present
    const versionList = page.locator(
      'table, [data-testid*="version"], [role="grid"]',
    );
    await expect(versionList.first()).toBeVisible({ timeout: 10_000 });
  });

  // Requires running backend API at localhost:5000
  test.skip('status badges display correctly', async ({ page }) => {
    await login(page);
    await page.goto('/budget/versions');

    // Status badges should show workflow states
    const statusPattern =
      /draft|taslak|submitted|gönderildi|approved|onaylandı|active|aktif/i;
    const badges = page.locator(
      '[data-testid*="status"], [class*="badge"], [class*="status"]',
    );
    await expect(badges.first()).toBeVisible({ timeout: 10_000 });

    const firstBadgeText = await badges.first().textContent();
    expect(firstBadgeText?.trim()).toMatch(statusPattern);
  });
});

test.describe('Approvals', () => {
  // Requires running backend API at localhost:5000
  test.skip('approvals page shows pending items', async ({ page }) => {
    await login(page);
    await page.goto('/approvals');

    await expect(page).toHaveURL('/approvals');

    // Page heading should be visible
    await expect(
      page.getByRole('heading', { name: /onay|approval/i }).first(),
    ).toBeVisible();

    // Should display a list or table of approval items (may be empty)
    const approvalContainer = page.locator(
      'table, [data-testid*="approval"], [role="grid"], [class*="approval"]',
    );
    await expect(approvalContainer.first()).toBeVisible({ timeout: 10_000 });
  });
});
