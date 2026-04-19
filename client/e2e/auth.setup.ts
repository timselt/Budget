import { test as setup, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Tek seferlik login + storageState cache.
 *
 * Diğer tüm spec'ler bu setup'a `dependencies: ['setup']` üzerinden
 * bağlıdır (playwright.config.ts). Token + refresh diske yazılır;
 * sonraki testler login ekranını hiç görmez.
 *
 * Credentials env üzerinden geçilir — repo'da hiç sabit yok:
 *   E2E_TEST_EMAIL=...
 *   E2E_TEST_PASSWORD=...
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  const isCI = process.env.CI === 'true'

  // Fork PR'larda veya secrets henüz konfigüre edilmemiş ortamlarda
  // CI'ı hard-fail yerine skip et. Lokal dev'de yine sert hata.
  setup.skip(
    isCI && (!email || !password),
    'E2E_TEST_EMAIL/E2E_TEST_PASSWORD secrets not configured for this CI run. ' +
      'Add them in Repo Settings -> Secrets and variables -> Actions to enable smoke coverage.',
  )

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL ve E2E_TEST_PASSWORD environment variables gerekli.\n' +
        'Örnek:\n' +
        '  E2E_TEST_EMAIL=e2e-test@finopstur.local \\\n' +
        '  E2E_TEST_PASSWORD="..." \\\n' +
        '  pnpm e2e',
    )
  }

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()

  // Login başarılı → AuthGuard `/`'a yönlendirir. URL bekle.
  await page.waitForURL('/', { timeout: 10_000 })

  // Sidebar gerçekten render olduğunda token + user bilgileri hazır demektir.
  await expect(page.locator('aside')).toContainText('FinOps')

  await page.context().storageState({ path: AUTH_FILE })
})
