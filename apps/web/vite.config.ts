import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { pruneCustomPropertiesPlugin } from './build-tools/prune-custom-properties.ts'
import pkg from './package.json' with { type: 'json' }
import { apiOrigin } from './scripts/finalize.ts'

// Plain `react-router build`: the Cloudflare Vite plugin does not support prerender (ADR-0001).
export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), pruneCustomPropertiesPlugin()],
  // app/env.d.ts. The same origin goes into the CSP connect-src (scripts/finalize.ts).
  define: { __API_ORIGIN__: JSON.stringify(apiOrigin()), __WEB_VERSION__: JSON.stringify(pkg.version) },
})
