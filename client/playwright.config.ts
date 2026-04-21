import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright smoke — kalıcı config (2026-04-19).
 *
 * Tasarım:
 *   1. Secrets mevcut (E2E_TEST_EMAIL + E2E_TEST_PASSWORD):
 *      setup projesi login yapar → chromium projesi storageState ile
 *      tam test zincirini koşturur. Üretimdeki doğrulama seviyesi.
 *
 *   2. Secrets YOK (local dev, fork PR, rotation boşluğu):
 *      chromium projesi `projects[]` listesine HİÇ eklenmez → dependent
 *      test'ler yaratılmaz → ENOENT yok. CI adım seviyesinde zaten
 *      ayrıca guard'lanır (`.github/workflows/ci.yml`), böylece
 *      "sessiz skip" görünürlüğü kaybolmaz.
 *
 * Bu config kalıcı olarak "defense in depth" sağlar: config seviyesinde
 * çökme olmaz, workflow seviyesinde ise skip durumu step adında açıkça
 * raporlanır.
 *
 * Secrets ekleme talimatı: `docs/compliance/ci-baseline-2026-04-19.md`
 */

const hasE2ECredentials = Boolean(
  process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD,
)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    ...(hasE2ECredentials
      ? [
          {
            name: 'chromium',
            use: {
              ...devices['Desktop Chrome'],
              storageState: 'e2e/.auth/user.json',
            },
            dependencies: ['setup'],
          },
        ]
      : []),
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
