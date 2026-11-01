import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: { TEST_MIGRATIONS: await readD1Migrations('./migrations'), SENTRY_DSN: '' }, // an empty DSN turns Sentry off in tests
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    // Floors = the coverage baseline at #93, rounded down. istanbul: v8 coverage does not run in the Workers pool. Raise them as tests grow; lower one only with the reason in the PR.
    coverage: {
      enabled: true,
      provider: 'istanbul',
      include: ['src/**'],
      reporter: ['text-summary'],
      thresholds: { statements: 96, branches: 93, functions: 98, lines: 97 },
    },
  },
})
