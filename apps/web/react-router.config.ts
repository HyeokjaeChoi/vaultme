import type { Config } from '@react-router/dev/config'

// ADR-0001: static site, no Worker code. Pages are prerendered at build; scripts/finalize.mjs then names the 404 pages 404.html.
export default {
  ssr: false,
  prerender: ['/404', '/en/404'],
} satisfies Config
