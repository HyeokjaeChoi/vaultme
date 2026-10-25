import type { Config } from '@react-router/dev/config'

// WEB_FIXTURE=1 is for test/build.test.ts only: a throwaway app (static index, hydrated route, 404) built into its own folder.
const fixture = process.env.WEB_FIXTURE === '1'

// ADR-0001: static site, no Worker code. Pages are prerendered at build; scripts/finalize.ts then names the 404 pages 404.html.
export default {
  ssr: false,
  appDirectory: fixture ? 'test/fixtures/app' : 'app',
  buildDirectory: fixture ? 'test/fixtures/build' : 'build',
  prerender: fixture
    ? ['/', '/hydrated', '/404', '/en/404']
    : ['/', '/en', '/404', '/en/404', '/address', '/en/address', '/tx', '/en/tx'],
} satisfies Config
