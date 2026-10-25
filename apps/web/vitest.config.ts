import { defineConfig } from 'vitest/config'

export default defineConfig({
  // vite.config.ts defines the real values; tests answer this origin with a stub fetch.
  define: { __API_ORIGIN__: JSON.stringify('https://api.test'), __WEB_VERSION__: JSON.stringify('0.1.0') },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      // root.tsx needs a data router (useMatches) and routes.ts is config: both are covered by the Playwright specs.
      include: ['app/**'],
      exclude: ['app/root.tsx', 'app/routes.ts'],
      reporter: ['text-summary'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
})
