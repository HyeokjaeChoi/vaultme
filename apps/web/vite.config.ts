import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { pruneCustomPropertiesPlugin } from './build-tools/prune-custom-properties.ts'

// Plain `react-router build`: the Cloudflare Vite plugin does not support prerender (ADR-0001).
export default defineConfig({ plugins: [tailwindcss(), reactRouter(), pruneCustomPropertiesPlugin()] })
