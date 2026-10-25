import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Floors = the coverage baseline at #190, rounded down. Raise them as tests grow; lower one only with the reason in the PR.
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary'],
      thresholds: { statements: 100, branches: 95, functions: 100, lines: 100 },
    },
  },
})
