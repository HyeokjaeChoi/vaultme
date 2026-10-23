import process from 'node:process'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import tseslint from 'typescript-eslint'

// Amount code must use bigint + decimal strings only (ARCHITECTURE.md#invariants).
const noFloat = {
  files: ['src/amount.ts', 'src/send.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.name=/^(Number|parseFloat|parseInt)$/]',
        message: 'No Number()/parseFloat in amount code. Use bigint and decimal strings.',
      },
      {
        selector: "CallExpression[callee.object.name='Number']",
        message: 'No Number.* in amount code. Use bigint and decimal strings.',
      },
    ],
  },
}

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    // projectService finds the nearest tsconfig.json of each file. tsconfigRootDir is set because apps/mobile adds its own
    // config file, and then typescript-eslint cannot pick a root alone. Turbo runs lint in the package dir; lint-staged runs at the repo root.
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: process.cwd() } },
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off', // owner choice: allow both interface and type
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },
  // Config and build scripts sit outside every tsconfig, so they get no type info.
  { files: ['**/*.{js,mjs,cjs}'], ...tseslint.configs.disableTypeChecked },
  {
    files: ['**/test/**', '**/*.test.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' }, // tests assert known fixtures; a throw adds noise
  },
  noFloat,
  prettier, // last: turns off rules that fight Prettier
)
