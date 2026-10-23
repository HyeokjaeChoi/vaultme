import base from '@vaultme/config/eslint'
import tseslint from 'typescript-eslint'

// AGENTS.md "Enforced rules" (R2, R5): no raw colors or numeric spacing in UI code. Values come from @vaultme/tokens.
const styleKeys =
  '/^(margin|padding|gap|rowGap|columnGap|border.*(Width|Radius)|fontSize|lineHeight|letterSpacing|width|height|min.*|max.*|top|left|right|bottom)/'
const noRawStyle = {
  files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]', message: 'No raw hex color. Use a token.' },
      { selector: 'Literal[value=/^(rgb|hsl)a?\\(/]', message: 'No raw rgb/hsl color. Use a token.' },
      {
        selector: `Property[key.name=${styleKeys}] > Literal[value>0]`,
        message: 'No raw spacing/size number. Use a token.',
      },
      {
        selector: `Property[key.name=${styleKeys}] > UnaryExpression`,
        message: 'No raw negative spacing. Use a token.',
      },
    ],
  },
}

// Workaround: screen files keep the old rule set until #107 fixes them with Figma comparison screenshots. Remove this block in #107.
// Globs mirror the Figma gate regex in AGENTS.md (screen code under app/, pages, widgets, shared/ui, features/*/ui).
const screenFiles = {
  files: [
    'app/**/*.tsx',
    'src/pages/**/*.tsx',
    'src/widgets/**/*.tsx',
    'src/shared/ui/**/*.tsx',
    'src/features/*/ui/**/*.tsx',
  ],
  ...tseslint.configs.disableTypeChecked,
  rules: {
    ...tseslint.configs.disableTypeChecked.rules,
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-invalid-void-type': 'off',
  },
}

export default [{ ignores: ['.expo', 'dist', 'plugins'] }, ...base, screenFiles, noRawStyle]
