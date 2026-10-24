import base from '@vaultme/config/eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import noEffect from 'eslint-plugin-react-you-might-not-need-an-effect'
import unicorn from 'eslint-plugin-unicorn'

const code = ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}']

// AGENTS.md "Enforced rules" (R2, R5): no raw colors or numeric spacing in UI code. Values come from @vaultme/tokens.
// The last selectors are Vercel React Native skill rules (#91): list-performance-*, list-performance-virtualize.
const styleKeys =
  '/^(margin|padding|gap|rowGap|columnGap|border.*(Width|Radius)|fontSize|lineHeight|letterSpacing|width|height|min.*|max.*|top|left|right|bottom)/'
const restrictedSyntax = {
  files: code,
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
      {
        selector:
          'JSXAttribute[name.name=/^(renderItem|renderSectionHeader|keyExtractor)$/] > JSXExpressionContainer > :function',
        message: 'Define list callbacks outside JSX so each row gets a stable reference.',
      },
      {
        selector:
          "JSXElement[openingElement.name.name='ScrollView'] > JSXExpressionContainer > CallExpression[callee.property.name='map']",
        message: 'A mapped list inside ScrollView renders every row. Use FlatList.',
      },
    ],
  },
}

// Vercel React Native skill rules ui-pressable, ui-safe-area-scroll, ui-native-modals (#91).
const restrictedImports = {
  files: code,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        name: 'react-native',
        importNames: ['TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'TouchableNativeFeedback'],
        message: 'Use Pressable.',
      },
      { name: 'react-native', importNames: ['SafeAreaView'], message: 'Use react-native-safe-area-context.' },
      { name: 'react-native', importNames: ['Modal'], message: 'Use BottomSheet from @/shared/ui.' },
    ],
  },
}
// BottomSheet is the one shared sheet; it is built on the RN Modal.
const bottomSheet = { files: ['src/shared/ui/BottomSheet.tsx'], rules: { 'no-restricted-imports': 'off' } }

// React rules from the Vercel React and React Native skills that an installable plugin can check (#91).
// Not here, because the plugin crashes on ESLint 10 or has no release older than 7 days:
// eslint-plugin-react (jsx-no-leaked-render), eslint-plugin-react-native (no-raw-text), @eslint-react (no-forward-ref,
// no-nested-component-definitions, no-unstable-default-props). Add each one when it installs and runs on ESLint 10.
// Not here by choice: react-perf flags every inline prop (478 hits), while the skill rule is about list rows (selector above);
// unicorn/no-barrel-files fights the FSD slice index.ts (ARCHITECTURE.md).
const react = [
  { files: code, ...reactHooks.configs.flat.recommended },
  { files: code, ...noEffect.configs.strict },
  {
    files: code,
    plugins: { unicorn },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/incompatible-library': 'error',
      'react-hooks/unsupported-syntax': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'unicorn/no-array-sort': 'error',
      'unicorn/no-array-reverse': 'error',
      'unicorn/no-array-sort-for-min-max': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-array-flat-map': 'error',
    },
  },
]

export default [
  { ignores: ['.expo', 'dist', 'plugins'] },
  ...base,
  ...react,
  restrictedSyntax,
  restrictedImports,
  bottomSheet,
]
