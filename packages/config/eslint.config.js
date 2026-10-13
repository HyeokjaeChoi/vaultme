import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// Amount code must use bigint + decimal strings only (LLD §12).
const noFloat = {
  files: ['src/amount.ts', 'src/send.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.name=/^(Number|parseFloat|parseInt)$/]",
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
  ...tseslint.configs.recommended,
  noFloat,
)
