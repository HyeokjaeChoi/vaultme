import { defineConfig } from 'vitest/config'
export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: {
    include: ['test/**/*.test.ts'],
    // Floors = the coverage baseline at #93, rounded down. Only .ts: screens (.tsx) are checked against Figma, not unit tests. Raise them as tests grow; lower one only with the reason in the PR. #188: statements and functions -1, the fully tested API client moved to packages/api-client.
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary'],
      thresholds: { statements: 64, branches: 73, functions: 58, lines: 65 },
    },
  },
})
