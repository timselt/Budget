import { test, expect } from '@playwright/test'

/**
 * Sprint 1 Deep — Ekran Yeniden Tasarımı E2E smoke (2026-04-19).
 *
 * Notlar:
 * - Material Symbols icon font'u DOM'da text bırakır; locator'larda role
 *   bazlı veya CSS selektör tercih edildi.
 * - Yetkisiz kullanıcı (role gating) testi ayrı storageState gerektirir;
 *   şimdilik TODO — admin user ile sayfa erişimi doğrulanır.
 * - Smart navigator "Düzelt →" tıklama davranışı conditional skip ile
 *   yapılır (test data'da nextStep yoksa atlanır).
 */
test.describe('Sprint 1 Deep — Ekran Yeniden Tasarımı', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('finopstur-onboarding-completed-v1', '1')
    })
  })

  test('Dashboard başlığı "Ana Sayfa"', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Ana Sayfa' })).toBeVisible()
    // Eski isim hiçbir yerde olmamalı
    await expect(page.locator('main')).not.toContainText('Executive Dashboard')
  })

  test('Versiyonlar tab — kart grid + Aktif yeşil şeritli en üstte', async ({
    page,
  }) => {
    await page.goto('/budget/planning?tab=versions')

    // Eski tablo yok — embedded içerikte tbody/<table>.tbl olmamalı
    await expect(page.locator('main table.tbl')).toHaveCount(0)

    // En az 1 VersionCard var ve ilk kart Aktif (yeşil şerit)
    const cards = page.locator('main [id^="version-card-"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    const cardCount = await cards.count()
    if (cardCount > 0) {
      // Aktif versiyon varsa ilk kart yeşil şeritli
      const activeBadge = page.locator('main .chip-success', {
        hasText: 'Aktif',
      })
      if ((await activeBadge.count()) > 0) {
        const firstCard = cards.first()
        await expect(firstCard).toHaveClass(/border-l-success/)
      }
    }
  })

  test('Versiyon kartı — sıradaki adım metni görünür', async ({ page }) => {
    await page.goto('/budget/planning?tab=versions')
    await expect(page.locator('main').getByText('Sıradaki adım').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('WorkContextBar smart navigator satırı varsa "Sıradaki adım" prefix\'i', async ({
    page,
  }) => {
    await page.goto('/budget/planning')
    // Düzenlenebilir versiyon yoksa nextStep null → satır yok; conditional check.
    const nextStepLine = page.locator('main', {
      hasText: /Sıradaki adım:/,
    })
    if ((await nextStepLine.count()) > 0) {
      await expect(nextStepLine.first()).toBeVisible()
    }
  })

  test('Forecast → PilotBanner görünür ("Pilot — Demo Veri" chip)', async ({
    page,
  }) => {
    await page.goto('/forecast')
    await expect(page.getByText('Pilot — Demo Veri').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('heading', { name: 'Tahmin' })).toBeVisible()
  })

  test('PnL → PilotBanner görünür', async ({ page }) => {
    await page.goto('/reports/pnl')
    await expect(page.getByText('Pilot — Demo Veri').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Konsolidasyon → PilotBanner görünür', async ({ page }) => {
    await page.goto('/consolidation')
    await expect(page.getByText('Pilot — Demo Veri').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Sidebar — pilot item\'ların yanında "Pilot" etiketi (admin user)', async ({
    page,
  }) => {
    await page.goto('/')
    // Analizler section'ı varsayılan kapalı — Tahmin görmek için aç
    const analysisHeader = page.locator(
      'aside button[data-section-id="analysis"]',
    )
    if (await analysisHeader.isVisible()) {
      await analysisHeader.click()
    }
    const tahminLink = page.locator('aside a.nav-item-child', {
      hasText: 'Tahmin',
    })
    await expect(tahminLink).toBeVisible()
    await expect(tahminLink.locator('text=Pilot')).toBeVisible()
  })

  // TODO: yetkisiz kullanıcı (RoleGuard 403) testi — ayrı storageState gerekli.
  // test('Sıradan kullanıcı /forecast → ForbiddenPage', ...)
})
