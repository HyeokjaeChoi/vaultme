// Token rules for CSS, same intent as the TS rules R2 and R5 (AGENTS.md): no raw colors, no raw px/rem sizes.
// Tailwind v4 at-rules are not in Stylelint's known list; the official `at-rule-no-unknown` option `ignoreAtRules` allows them.
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'at-rule-no-unknown': [
      true,
      { ignoreAtRules: ['theme', 'utility', 'custom-variant', 'variant', 'source', 'plugin', 'apply', 'reference'] },
    ],
    // `@utility` bodies hold declarations after nested `@media`, which Tailwind accepts.
    'no-invalid-position-declaration': [true, { ignoreAtRules: ['utility'] }],
    // Tailwind's `@import 'tailwindcss'` is a bare string; the standard config wants url().
    'import-notation': 'string',
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
    'declaration-property-unit-disallowed-list': {
      // Every property (border, outline, box-shadow, translate, font shorthand ...), not a name list. `rem` in `@media` is a query, not a declaration.
      '/./': ['px', 'rem', 'em'],
    },
  },
}
