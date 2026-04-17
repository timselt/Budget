import { defineConfig } from 'vitest/config'

/**
 * Separated from `vite.config.ts` because Vitest ships its own Vite-compatible
 * type for `UserConfig` and mixing the two on a single `defineConfig` call
 * makes TypeScript complain about http-proxy-middleware types. Vitest picks
 * this file up automatically (CLI preference: `vitest.config.ts` over
 * `vite.config.ts`). Test-time plugins stay light because the SPA under test
 * is pure logic — no React render harness needed yet.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Exclude Playwright specs (under e2e/) so `pnpm test` only runs Vitest;
    // Playwright has its own harness (`pnpm e2e`).
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
})
