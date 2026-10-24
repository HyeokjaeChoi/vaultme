import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

// FSD folder checks (#92). Import rules are in eslint.config.mjs (eslint-plugin-boundaries), because steiger does not read
// imports from files outside segments, and our page and widget slices are single files.
export default defineConfig([
  ...fsd.configs.recommended,
  { ignores: ['**/generated/**'] },
  {
    rules: {
      'fsd/no-segmentless-slices': 'off', // pages and widgets are single-file slices by design
      'fsd/insignificant-slice': 'off', // misses references from those files; boundaries checks the imports
      'fsd/segments-by-purpose': 'off', // flags app/providers, the name the FSD docs use
    },
  },
])
