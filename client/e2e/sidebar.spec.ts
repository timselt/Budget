import { test, expect } from '@playwright/test'

/**
 * Sidebar redesign (2026-04-19) E2E smoke.
 *
 * Notlar:
 * - Material Symbols icon font'u DOM'da `<span>edit_note</span>` text'i
 *   bırakır; bu yüzden link'leri `getByRole('link', { name })` veya
 *   `:has-text(...)` ile hedefliyoruz, `getByText(exact: true)` ile değil.
 * - Her test localStorage'ı temizler — accordion state izolasyonu.
 */

test.describe('Sidebar — yeni bilgi mimarisi', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Onboarding tour overlay'i click'leri intercept ediyor; tamamlandı
      // işaretle. Bileşen `=== '1'` ile kontrol ediyor (bkz. OnboardingTour.tsx).
      localStorage.setItem('finopstur-onboarding-completed-v1', '1')

      // Sidebar accordion state izolasyonu — sadece test'in İLK page load'unda
      // temizle. addInitScript her reload'da çalışır; sessionStorage flag'i ile
      // reload sonrası manuel ayarlanan state'in silinmesini önlüyoruz (örn.
      // accordion persist testinde reload sonrası key korunmalı).
      if (!sessionStorage.getItem('__sidebar_test_initialized')) {
        sessionStorage.setItem('__sidebar_test_initialized', '1')
        const keys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sidebar-section-open:')) keys.push(key)
        }
        keys.forEach((k) => localStorage.removeItem(k))
      }
    })
  })

  test('8 section başlığı doğru sırada görünüyor', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')

    // Section header'lar (accordion düğmeleri) ve tek-link section'lar
    const headers = sidebar.locator('.sidebar-section-header')
    const directLinks = sidebar.locator('a.nav-item:not(.nav-item-child)')

    await expect(directLinks.filter({ hasText: 'Ana Sayfa' })).toHaveCount(1)

    const sectionLabels = [
      'Bütçe Çalışması',
      'Gerçekleşenler',
      'Onay ve Yayın',
      'Analizler',
      'Raporlar',
      'Tanımlar',
      'Sistem',
    ]
    for (const label of sectionLabels) {
      await expect(headers.filter({ hasText: label })).toHaveCount(1)
    }
  })

  test('eski isimler sidebar\'da görünmüyor', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toContainText('Dashboard')
    await expect(sidebar).not.toContainText('Forecast')
    await expect(sidebar).not.toContainText('Audit Log')
    await expect(sidebar).not.toContainText('Onay Akışı')
    await expect(sidebar).not.toContainText('Kategori Yönetimi')
    await expect(sidebar).not.toContainText('Müşteri Yönetimi')
    await expect(sidebar).not.toContainText('Ürün Yönetimi')
    await expect(sidebar).not.toContainText('Rapor İndir')
  })

  test('varsayılan açık: Bütçe Çalışması ve Onay ve Yayın', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')

    // Açık section'ların child link'leri görünür
    await expect(
      sidebar.locator('a.nav-item-child', { hasText: 'Bütçe Planlama' }),
    ).toBeVisible()
    await expect(
      sidebar.locator('a.nav-item-child', { hasText: 'Onaylar' }),
    ).toBeVisible()

    // Kapalı section'ların child'ları render edilmemiş (DOM'da yok)
    await expect(
      sidebar.locator('a.nav-item-child', { hasText: 'Tahsilat' }),
    ).toHaveCount(0)
    await expect(
      sidebar.locator('a.nav-item-child', { hasText: 'İşlem Geçmişi' }),
    ).toHaveCount(0)
  })

  test('accordion toggle + localStorage persist', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')

    // Başlangıç: Gerçekleşenler kapalı → Tahsilat DOM'da yok
    await expect(
      sidebar.locator('a.nav-item-child', { hasText: 'Tahsilat' }),
    ).toHaveCount(0)

    // Section header'ı data-section-id ile garantili hedefle (icon font'unun
    // accessible name'i kirlettiği regex eşleşme ihtimalini eler).
    const header = sidebar.locator('button[data-section-id="actuals"]')
    await expect(header).toHaveAttribute('aria-expanded', 'false')
    await header.click()
    await expect(header).toHaveAttribute('aria-expanded', 'true')
    await expect(
      sidebar.locator('a.nav-item-child', { hasText: 'Tahsilat' }),
    ).toBeVisible()

    // localStorage'a yazılmış
    const stored = await page.evaluate(() =>
      localStorage.getItem('sidebar-section-open:actuals'),
    )
    expect(stored).toBe('1')

    // Reload sonrası açık kalmalı
    await page.reload()
    await expect(
      sidebar.locator('a.nav-item-child', { hasText: 'Tahsilat' }),
    ).toBeVisible()
  })

  test('Revizyonlar tıklanınca placeholder görünüyor', async ({ page }) => {
    await page.goto('/')
    // Onay ve Yayın default açık → Revizyonlar child link görünür
    await page
      .locator('aside')
      .locator('a.nav-item-child', { hasText: 'Revizyonlar' })
      .click()
    await expect(page).toHaveURL(/\/revisions$/)
    await expect(
      page.getByRole('heading', { name: 'Revizyonlar' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Yakında' })).toBeVisible()
  })

  test('aktif bağlam satırı yıl + versiyon gösteriyor', async ({ page }) => {
    await page.goto('/')
    const ctx = page.locator('aside').getByText('Aktif Bağlam').locator('..')
    await expect(ctx).toContainText(/20\d{2}/)
  })

  test('Versiyonlar tab linki tab=versions URL\'de doğru aktif state\'i alır', async ({
    page,
  }) => {
    // URL = /budget/planning  → "Bütçe Planlama" active, "Versiyonlar" NOT
    await page.goto('/budget/planning')
    const planningLink = page.locator(
      'aside a.nav-item-child[href="/budget/planning"]',
    )
    const versionsLink = page.locator(
      'aside a.nav-item-child[href="/budget/planning?tab=versions"]',
    )
    await expect(planningLink).toHaveClass(/\bactive\b/)
    await expect(versionsLink).not.toHaveClass(/\bactive\b/)

    // URL = /budget/planning?tab=versions  → "Versiyonlar" active, "Bütçe Planlama" NOT
    await page.goto('/budget/planning?tab=versions')
    await expect(versionsLink).toHaveClass(/\bactive\b/)
    await expect(planningLink).not.toHaveClass(/\bactive\b/)
  })

  test('BudgetEntryPage versiyon dropdown değişikliği bağlam satırını günceller', async ({
    page,
  }) => {
    await page.goto('/budget/planning')
    const ctx = page.locator('aside').getByText('Aktif Bağlam').locator('..')
    await expect(ctx).toContainText(/20\d{2}/)
    const initialText = (await ctx.textContent())?.trim() ?? ''

    // Sayfa header'ında 2 select var: yıl + versiyon
    const versionSelect = page.locator('main select').nth(1)
    await expect(versionSelect).toBeVisible({ timeout: 10_000 })

    const optionTexts = await versionSelect.locator('option').allTextContents()
    if (optionTexts.length < 2) {
      test.skip(true, 'Test datasında ≥2 versiyon yok')
    }

    // İlk seçili olmayan + initial label'da geçmeyen bir option seç
    const targetIndex = optionTexts.findIndex(
      (txt, i) => i > 0 && txt.trim() && !initialText.includes(txt.trim()),
    )
    if (targetIndex < 0) {
      test.skip(true, 'Farklı versiyon bulunamadı')
    }

    await versionSelect.selectOption({ index: targetIndex })

    // Bağlam satırı değişmeli
    await expect(ctx).not.toHaveText(initialText, { timeout: 5_000 })
  })
})
