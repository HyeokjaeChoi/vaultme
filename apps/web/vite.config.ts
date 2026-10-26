import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { pruneCustomPropertiesPlugin } from './build-tools/prune-custom-properties.ts'
import pkg from './package.json' with { type: 'json' }
import { apiOrigin } from './scripts/finalize.ts'

// Plain `react-router build`: the Cloudflare Vite plugin does not support prerender (ADR-0001).
export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), pruneCustomPropertiesPlugin()],
  // react-router is shared by the entry, the root and both viewer routes: one chunk, not two (each JS response carries the full
  // _headers, ~1.5 KB, and counts against the viewer's Lighthouse script budget).
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'router', test: /node_modules[\\/]react-router[\\/]/ }] } },
    },
  },
  // app/env.d.ts. The same origin goes into the CSP connect-src (scripts/finalize.ts).
  define: { __API_ORIGIN__: JSON.stringify(apiOrigin()), __WEB_VERSION__: JSON.stringify(pkg.version) },
})
