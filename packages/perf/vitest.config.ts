import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      // cli.ts only wires arguments and files to the tested functions.
      include: ['src/**'],
      exclude: ['src/cli.ts'],
      reporter: ['text-summary'],
      thresholds: { statements: 95, branches: 80, functions: 90, lines: 95 },
    },
  },
})
