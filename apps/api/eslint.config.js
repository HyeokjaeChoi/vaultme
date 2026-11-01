import config from '@vaultme/config/eslint'

// D1 is queried through Drizzle (`getDb` in src/db, ADR-0029): a raw `DB.prepare(...)` string brings back hand-written row casts.
const noRawD1 = {
  files: ['src/**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='prepare']",
        message: 'Query D1 through Drizzle (getDb from src/db), not DB.prepare (ADR-0029).',
      },
    ],
  },
}

export default [{ ignores: ['.wrangler'] }, ...config, noRawD1]
