import { test, expect } from '@playwright/test'

/**
 * F4 Part 2c smoke tests for the AG-Grid surface that F4 Part 2b
 * shipped. AuthGuard is bypassed by seeding a placeholder token in
 * localStorage before navigation — the page's sample rows are static
 * so no API call is required for these assertions.
 */

async function bypassAuth(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  await page.addInitScript(() => {
    window.localStorage.setItem('access_token', 'playwright-smoke-token')
    window.localStorage.setItem('refresh_token', 'playwright-smoke-refresh')
  })
}

test.describe('BudgetGrid (AG-Grid Community)', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page)
  })

  test('renders Turkish month headers (ADR-0008 §2.4)', async ({ page }) => {
    await page.goto('/budget/planning')

    // AG-Grid header row renders async; the theme class is mounted
    // synchronously so we use it as a stabilising wait.
    await expect(page.locator('.ag-theme-quartz').first()).toBeVisible()

    // Turkish month headers sourced from BudgetGrid.tsx columnDefs.
    await expect(page.getByRole('columnheader', { name: 'Müşteri' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Ocak' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Aralık' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Toplam' })).toBeVisible()
  })

  test('sample customer rows are visible', async ({ page }) => {
    await page.goto('/budget/planning')
    await expect(page.getByText('AK Sigorta').first()).toBeVisible()
    await expect(page.getByText('Koç Holding').first()).toBeVisible()
  })

  test('/forbidden page renders without auth (ADR-0009 §2.2 route)', async ({ page }) => {
    // Fresh context — no token seeded; /forbidden must render without
    // bouncing the user into an auth loop.
    await page.goto('/forbidden')
    await expect(page.getByRole('heading', { name: /403/ })).toBeVisible()
  })
})
