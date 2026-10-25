import config from '@vaultme/config/eslint'

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

export default [
  { ignores: ['build', '.react-router', '.wrangler', 'playwright-report', 'test-results', '.lighthouseci'] },
  ...config,
  tokensOnly,
]
