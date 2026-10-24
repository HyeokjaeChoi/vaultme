import base from '@vaultme/config/eslint'
import boundaries from 'eslint-plugin-boundaries'
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
        selector: 'CallExpression[callee.property.name=/^(toSorted|toReversed|toSpliced)$/]',
        message: 'Hermes in this app has no ES2023 copy methods (crash in #93). Copy, then sort or reverse in place.',
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

// FSD layers (ARCHITECTURE.md#mobile-layers, #92). Imports go down only, and into another slice only through its index file.
// shared/lib is a set of small independent modules, so each file there is a public entry. expo-router files under app/ only
// render the shell (FSD app layer) or a page. The app layer is src/shell because Expo Router takes src/app as its route folder. steiger checks the folder structure (see package.json "lint").
const index = 'index.{ts,tsx}'
const below = {
  shell: ['pages', 'widgets', 'features', 'entities', 'shared'],
  pages: ['widgets', 'features', 'entities', 'shared'],
  widgets: ['features', 'entities', 'shared'],
  features: ['entities', 'shared', 'generated'], // licenses reads the generated license list
  entities: ['shared'],
  shared: [],
  route: ['shell', 'pages', 'shared'], // shared/lib only: the crypto polyfill must load first in app/_layout.tsx
}
const layers = {
  files: code,
  plugins: { boundaries },
  settings: {
    'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
    'boundaries/elements': [
      { type: 'route', pattern: 'app/**', partialMatch: false },
      { type: 'shell', pattern: 'src/shell' },
      { type: 'generated', pattern: 'src/generated' },
      ...['pages', 'widgets', 'features', 'entities', 'shared'].map((type) => ({
        type,
        pattern: `src/${type}/*`,
        capture: ['slice'],
      })),
    ],
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
          {
            from: { element: { type: '*' } },
            allow: {
              to: {
                element: { type: '{{ from.element.type }}', captured: { slice: '{{ from.element.captured.slice }}' } },
              },
            },
          },
          // shared has segments, not slices: they may use each other's files
          { from: { element: { type: 'shared' } }, allow: { to: { element: { type: ['shared', 'generated'] } } } },
          ...Object.entries(below).map(([from, to]) => ({
            from: { element: { type: from } },
            allow: [
              {
                to: {
                  element: { type: to.filter((t) => !(from === 'route' && t === 'shared')), fileInternalPath: index },
                },
              },
              ...(to.includes('shared') ? [{ to: { element: { type: 'shared', captured: { slice: 'lib' } } } }] : []),
              ...(to.includes('generated') ? [{ to: { element: { type: 'generated' } } }] : []),
            ],
          })),
        ],
      },
    ],
  },
}

export default [
  { ignores: ['.expo', 'dist', 'plugins'] },
  ...base,
  ...react,
  restrictedSyntax,
  restrictedImports,
  bottomSheet,
  layers,
]
