import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// Reorg tests (#316, Q67): the same Workers runtime as `vitest.config.ts`, plus a local anvil chain (`reorg-setup.ts`).
// Run with `pnpm test:reorg`. Kept apart from `test` so `pnpm test` needs no Foundry; CI runs both (job `verify`).
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: { bindings: { TEST_MIGRATIONS: await readD1Migrations('./migrations'), SENTRY_DSN: '' } },
    }),
  ],
  test: {
    include: ['test-reorg/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./reorg-setup.ts'],
  },
})
