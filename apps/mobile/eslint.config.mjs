import base from '@vaultme/config/eslint'

// LLD §1.1: no raw colors or numeric spacing in UI code. Values come from @vaultme/tokens.
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

export default [{ ignores: ['.expo', 'dist', 'plugins'] }, ...base, noRawStyle]
