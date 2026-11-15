import { defineConfig } from 'vitest/config'

// Send-lifecycle tests on a local anvil chain (`anvil-setup.ts`), with the real app code (CHAIN-3, Q67).
// Run with `pnpm test:anvil`. Kept apart from `test` so `pnpm test` needs no Foundry; CI runs both (job `verify`).
export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: {
    include: ['test-anvil/**/*.test.ts'],
    globalSetup: ['./anvil-setup.ts'],
    testTimeout: 10_000, // each case <= 10 s; the suite limit of 60 s is `timeout 60` in ci.yml
    fileParallelism: false, // every file shares the one chain
  },
})
