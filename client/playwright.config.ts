import { defineConfig, devices } from '@playwright/test'

/**
 * F4 Part 2c Playwright harness.
 *
 * Scope (intentionally narrow): static SPA smoke tests that exercise the
 * browser-only pieces of ADR-0009 (AG-Grid render, toast mount, route
 * wiring). Cross-process E2E that need the .NET API + Postgres running
 * belong to F5 (Golden Scenario + E2E).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // single dev server, avoid port contention
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Bir kez login olup storageState'i diske yazan setup projesi.
    // Diğer projeler bu dosyadan token okuyup AuthGuard'ı geçer; her test
    // başında login etmeyiz. Token süresi dolarsa setup tekrar çalışır.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
