import config from '@vaultme/config/eslint'

// k6 scripts run in k6, not in Node: its globals are not Node's.
const k6Globals = {
  __ENV: 'readonly',
  __ITER: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  TextEncoder: 'readonly',
}

export default [...config, { files: ['k6/**/*.js'], languageOptions: { globals: k6Globals } }]
