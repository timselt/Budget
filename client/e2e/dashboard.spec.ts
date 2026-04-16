import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Dashboard', () => {
  // Requires running backend API at localhost:5000
  test.skip('dashboard loads KPI cards', async ({ page }) => {
    await login(page);

    await expect(page).toHaveURL('/');

    // Verify at least one KPI card container is visible
    const kpiCards = page.locator(
      '[data-testid*="kpi"], .kpi-card, [class*="kpi"]',
    );
    await expect(kpiCards.first()).toBeVisible({ timeout: 10_000 });

    // Expect multiple KPI cards on the dashboard
    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // Requires running backend API at localhost:5000
  test.skip('KPI cards show formatted numeric values', async ({ page }) => {
    await login(page);

    const kpiCards = page.locator(
      '[data-testid*="kpi"], .kpi-card, [class*="kpi"]',
    );
    await expect(kpiCards.first()).toBeVisible({ timeout: 10_000 });

    // KPI values should contain formatted numbers (digits, dots, commas, currency symbols)
    const firstCardText = await kpiCards.first().textContent();
    expect(firstCardText).toMatch(/[\d.,]+/);
  });

  // Requires running backend API at localhost:5000
  test.skip('charts section renders at least one chart', async ({ page }) => {
    await login(page);

    // Recharts renders SVG elements with the recharts class
    const charts = page.locator(
      '.recharts-wrapper, [data-testid*="chart"], svg.recharts-surface',
    );
    await expect(charts.first()).toBeVisible({ timeout: 10_000 });
  });
});
