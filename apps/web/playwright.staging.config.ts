import { defineConfig, devices } from '@playwright/test'

// WEB-5: the viewer against the real staging site and the real staging API, after each staging web deploy (`web-staging.yml`).
// A separate testDir, so CI `web` (playwright.config.ts, `e2e`) never runs it: the staging token rule in apps/web/AGENTS.md.
// No webServer, no secret: the site and the API are public. Retries cover an upstream blip (Etherscan, RPC), not a broken page.
export default defineConfig({
  testDir: 'e2e-staging',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.STAGING_WEB_URL ?? 'https://vaultme-staging.stack-line.dev',
    ...devices['Desktop Chrome'],
    // The history table is the 768+ layout; the specs read its rows.
    viewport: { width: 1280, height: 900 },
  },
})
