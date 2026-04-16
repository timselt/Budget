import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Navigation', () => {
  // All navigation tests require authentication via the backend API
  test.skip('sidebar links navigate to correct routes', async ({ page }) => {
    await login(page);

    const routes = [
      { name: /dashboard|ana sayfa|gösterge/i, url: '/' },
      { name: /bütçe|budget/i, url: '/budget' },
      { name: /müşteri|customer/i, url: '/customers' },
      { name: /gider|expense/i, url: '/expenses' },
      { name: /varyans|variance|sapma/i, url: '/variance' },
      { name: /senaryo|scenario/i, url: '/scenarios' },
      { name: /kur|fx/i, url: '/fx-rates' },
      { name: /onay|approval/i, url: '/approvals' },
    ] as const;

    for (const route of routes) {
      await page.getByRole('link', { name: route.name }).click();
      await expect(page).toHaveURL(route.url);
    }
  });

  // Requires running backend API at localhost:5000
  test.skip('page titles render on each route', async ({ page }) => {
    await login(page);

    const pages = [
      { url: '/', heading: /dashboard|gösterge|ana sayfa/i },
      { url: '/budget', heading: /bütçe/i },
      { url: '/customers', heading: /müşteri/i },
      { url: '/expenses', heading: /gider/i },
      { url: '/variance', heading: /varyans|sapma/i },
      { url: '/scenarios', heading: /senaryo/i },
      { url: '/fx-rates', heading: /kur|döviz/i },
      { url: '/approvals', heading: /onay/i },
    ] as const;

    for (const p of pages) {
      await page.goto(p.url);
      await expect(
        page.getByRole('heading', { name: p.heading }).first(),
      ).toBeVisible();
    }
  });

  // Requires running backend API at localhost:5000
  test.skip('back and forward browser navigation works', async ({ page }) => {
    await login(page);

    await page.goto('/budget');
    await expect(page).toHaveURL('/budget');

    await page.goto('/customers');
    await expect(page).toHaveURL('/customers');

    await page.goBack();
    await expect(page).toHaveURL('/budget');

    await page.goForward();
    await expect(page).toHaveURL('/customers');
  });
});
