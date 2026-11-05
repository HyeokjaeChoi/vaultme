import config from '@vaultme/config/eslint'
import { fsdLayers } from '@vaultme/config/fsd'

// Same no-raw-values rule as apps/mobile (AGENTS.md R2, R5), for Tailwind classes: arbitrary values bypass @vaultme/tokens.
const tokensOnly = {
  files: ['app/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]', message: 'No raw hex color. Use a token.' },
      { selector: 'Literal[value=/^(rgb|hsl)a?\\(/]', message: 'No raw rgb/hsl color. Use a token.' },
      {
        selector: 'Literal[value=/(^|\\s)[a-z:-]*[a-z]-\\[[^\\]]+\\]/]',
        message: 'No Tailwind arbitrary value like p-[13px]. Use a token utility.',
      },
      {
        selector: 'TemplateElement[value.raw=/(^|\\s)[a-z:-]*[a-z]-\\[[^\\]]+\\]/]',
        message: 'No Tailwind arbitrary value like p-[13px]. Use a token utility.',
      },
    ],
  },
}

// FSD layers (#116, ARCHITECTURE.md): the shared preset in packages/config. Layers live in app/, the app layer is app/shell
// (app/ is React Router's folder, as src/app is Expo Router's). Route files are app/routes (app/root.tsx is not checked: a single-file element needs the deprecated `mode: 'file'`, which prints a warning on every run). shared has no
// index file: every file in shared/api, shared/lib and shared/ui is a public entry.
const layers = fsdLayers({
  files: ['app/**/*.{ts,tsx}'],
  root: 'app',
  routes: [{ pattern: 'app/routes', partialMatch: false }],
  routeMayImport: ['shell', 'pages', 'widgets', 'features', 'entities', 'shared'],
  sharedEntries: ['api', 'lib', 'ui'],
})

// Q59 (#312): the web viewer never signs. Key and signing code stays behind @vaultme/wallet-core/signer.
const noSigner = {
  files: ['app/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      { name: '@vaultme/wallet-core/signer', message: 'The web app must not import signing code (Q59, #312).' },
    ],
  },
}

export default [
  { ignores: ['build', '.react-router', '.wrangler', 'playwright-report', 'test-results', '.lighthouseci'] },
  ...config,
  tokensOnly,
  noSigner,
  ...layers,
]
