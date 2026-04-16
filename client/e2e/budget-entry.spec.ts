import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Budget Entry', () => {
  // Requires running backend API at localhost:5000
  test.skip('budget page loads with version selector', async ({ page }) => {
    await login(page);
    await page.goto('/budget');

    await expect(page).toHaveURL('/budget');

    // Version selector dropdown or combobox should be present
    const versionSelector = page.locator(
      '[data-testid*="version"], select, [role="combobox"]',
    ).first();
    await expect(versionSelector).toBeVisible({ timeout: 10_000 });
  });

  // Requires running backend API at localhost:5000
  test.skip('AG-Grid renders with month columns', async ({ page }) => {
    await login(page);
    await page.goto('/budget');

    // AG-Grid renders with specific class names
    const grid = page.locator('.ag-root-wrapper, [data-testid*="grid"]');
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });

    // Check for month column headers (Turkish month abbreviations or full names)
    const monthPattern =
      /oca|şub|mar|nis|may|haz|tem|ağu|eyl|eki|kas|ara|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i;
    const headerCells = page.locator('.ag-header-cell-text');
    const headerTexts = await headerCells.allTextContents();

    const hasMonthColumn = headerTexts.some((text) =>
      monthPattern.test(text),
    );
    expect(hasMonthColumn).toBe(true);
  });

  // Requires running backend API at localhost:5000
  test.skip('tab switch between Gelir and Hasar sections', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/budget');

    // Look for tab buttons for Gelir (Revenue) and Hasar (Claims)
    const gelirTab = page.getByRole('tab', { name: /gelir|revenue/i });
    const hasarTab = page.getByRole('tab', { name: /hasar|claims/i });

    await expect(gelirTab).toBeVisible();
    await expect(hasarTab).toBeVisible();

    // Click Hasar tab and verify it becomes active
    await hasarTab.click();
    await expect(hasarTab).toHaveAttribute('aria-selected', 'true');

    // Switch back to Gelir
    await gelirTab.click();
    await expect(gelirTab).toHaveAttribute('aria-selected', 'true');
  });
});
