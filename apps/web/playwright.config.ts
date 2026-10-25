import { defineConfig, devices } from '@playwright/test'

// WEB_E2E_PORT: another checkout's server may hold 8799 locally (reuseExistingServer would test that build).
const PORT = process.env.WEB_E2E_PORT ?? '8799'
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  // The built site served by the real Workers Static Assets runtime: status codes, _headers and _redirects are the product.
  // Run `pnpm build` first (CI does).
  webServer: {
    command: `pnpm exec wrangler dev --env staging --port ${PORT}`,
    port: Number(PORT),
    reuseExistingServer: !process.env.CI,
  },
})
