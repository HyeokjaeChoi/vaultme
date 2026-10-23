// DESIGN.md front matter (Google DESIGN.md spec, version alpha) generated from tokens.json.
// `node design-md.mjs --write` rewrites the front matter of the root DESIGN.md; test/design-md.test.ts fails when it is stale.
// Mapping: semantic colors, type.productB, radius, space + layout roles, a curated component list. The spec has no modes,
// so the front matter is the light theme; DESIGN.md prose describes dark. No dependencies: aliases resolve here.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import process from 'node:process'

export const designPath = resolvePath(import.meta.dirname, '../../DESIGN.md')
export const tokensPath = resolvePath(import.meta.dirname, 'tokens.json')

export function frontMatter(src, theme = 'light') {
  const sets = { primitive: src.primitive, semantic: src.semantic, component: src.component }
  const dark = src.semanticDark

  const isTok = (o) => o && typeof o === 'object' && 'value' in o && 'type' in o
  const get = (tree, p) => p.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), tree)
  const flat = (tree, pre = '', out = {}) => {
    for (const [k, v] of Object.entries(tree ?? {})) {
      if (k.startsWith('$')) continue
      if (isTok(v)) out[pre + k] = v
      else flat(v, pre + k + '.', out)
    }
    return out
  }
  // Look up a path. Dark theme: semanticDark overrides semantic.
  const lookup = (p) =>
    theme === 'dark' && isTok(get(dark, p))
      ? get(dark, p)
      : ['semantic', 'primitive', 'component'].map((s) => get(sets[s], p)).find(isTok)
  const alias = (v) => (typeof v === 'string' && /^\{[^}]+\}$/.test(v) ? v.slice(1, -1) : null)
  // Follow an alias chain. Returns [paths visited..., final raw value].
  function chain(path) {
    const t = lookup(path)
    if (!t) throw new Error(`unresolved alias {${path}}`)
    const next = alias(t.value)
    return next ? [path, ...chain(next)] : [path, t.value]
  }
  const raw = (path) => chain(path).at(-1)
  const resolve = (v) => (alias(v) ? raw(alias(v)) : v)

  const kebab = (s) =>
    s
      .replace(/_/g, '-')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
  const q = (s) => (/^[#{]|[:\s]/.test(String(s)) ? JSON.stringify(String(s)) : String(s))
  const pct2em = (v) => (typeof v === 'string' && v.endsWith('%') ? `${+(parseFloat(v) / 100).toFixed(4)}em` : v)
  const WEIGHT = { regular: 400, medium: 500, 'semi bold': 600, bold: 700 }

  // ---- colors: semantic color roles, resolved. Names: group-leaf in kebab-case.
  const colors = {}
  const colorPath = {} // semantic path -> colors key (for component refs)
  for (const [p, t] of Object.entries(flat(sets.semantic))) {
    if (t.type !== 'color') continue
    if (
      p.startsWith('action.') ||
      p === 'brand.primary' ||
      p === 'brand.secondary' ||
      p === 'navigation.active' ||
      p.startsWith('surface.') ||
      p.startsWith('text.') ||
      p.startsWith('icon.') ||
      p.startsWith('border.') ||
      p.startsWith('status.') ||
      p.startsWith('financial.') ||
      p.startsWith('check.')
    ) {
      const name = kebab(p.replace(/\./g, '-'))
      colors[name] = raw(p)
      colorPath[p] = name
    }
  }
  // Spec-recommended anchors. primary = brand action blue. neutral = ink.
  const anchors = {
    primary: 'brand.primary',
    'on-primary': 'action.primary.fg.default',
    secondary: 'brand.secondary',
    neutral: 'text.primary',
  }
  const colorOut = {}
  for (const [k, p] of Object.entries(anchors)) colorOut[k] = raw(p)
  Object.assign(colorOut, colors)
  // Brand blue hover/pressed have no semantic path of their own, so the action.* entries above carry them.
  const colorByHex = (hex) => Object.entries(colorOut).find(([, h]) => h === hex)?.[0]

  // ---- typography: type.productB.* (the scale the app uses). Resolve refs, % tracking -> em.
  const typography = {}
  const typePath = {}
  for (const [name, t] of Object.entries(sets.primitive.type.productB)) {
    const v = t.value
    const fam = raw(alias(v.fontFamily)),
      wt = String(raw(alias(v.fontWeight))).toLowerCase()
    const o = {
      fontFamily: fam,
      fontSize: raw(alias(v.fontSize)),
      fontWeight: WEIGHT[wt] ?? Number(wt),
      lineHeight: raw(alias(v.lineHeight)),
    }
    const ls = pct2em(resolve(v.letterSpacing))
    if (ls && parseFloat(ls) !== 0) o.letterSpacing = ls
    typography[kebab(name)] = o
    typePath[`type.productB.${name}`] = kebab(name)
  }

  // ---- rounded
  const rounded = {},
    roundedPath = {}
  for (const [p, t] of Object.entries(flat(sets.primitive.radius, 'radius.'))) {
    const n = p.slice(7) === 'pill' ? 'full' : p.slice(7)
    rounded[n] = t.value
    roundedPath[p] = n
  }

  // ---- spacing: space.* plus layout roles and the sizes that act as spacing/target dimensions.
  const spacing = {},
    spacingPath = {}
  for (const [p, t] of Object.entries(flat(sets.primitive.space, 'space.'))) {
    const n = 'space-' + p.slice(6).replace('_', '-')
    spacing[n] = t.value
    spacingPath[p] = n
  }
  for (const [p, n] of Object.entries({
    'layout.screen.padding': 'screen-padding',
    'layout.sectionGap.product': 'section-gap',
    'layout.groupGap': 'group-gap',
    'layout.rowGap': 'row-gap',
    'layout.fieldGap': 'field-gap',
    'layout.contentMaxWidth': 'content-max-width',
    'layout.review.maxWidth': 'review-max-width',
  }))
    spacing[n] = raw(p)
  for (const k of [
    'touch_min',
    'control_sm',
    'control_md',
    'control_lg',
    'pill_sm',
    'pill_md',
    'pill_lg',
    'icon_sm',
    'icon_md',
    'icon_lg',
    'asset_row',
    'wallet_row',
  ])
    spacing[kebab(k)] = sets.primitive.size[k].value

  // ---- components: curated map, our token path -> spec property. Refs are kept when the chain passes a named token.
  const ref = (path, kind) => {
    const maps = { color: colorPath, rounded: roundedPath, typography: typePath, spacing: spacingPath }
    const group = { color: 'colors', rounded: 'rounded', typography: 'typography', spacing: 'spacing' }[kind]
    for (const p of chain(path).slice(0, -1)) if (maps[kind][p]) return `{${group}.${maps[kind][p]}}`
    const r = raw(path)
    return kind === 'color' && colorByHex(r) ? `{colors.${colorByHex(r)}}` : r
  }
  const P = (...a) => a
  const C = {
    'button-primary': [
      P('backgroundColor', 'color', 'button.primary.bg.default'),
      P('textColor', 'color', 'button.primary.fg.default'),
      P('rounded', 'rounded', 'buttonB.radius'),
      P('height', 'raw', 'buttonB.height.lg'),
      P('padding', 'spacing', 'buttonB.paddingX.lg'),
      P('typography', 'typography', null, 'headline'),
    ],
    'button-primary-hover': [P('backgroundColor', 'color', 'button.primary.bg.hover')],
    'button-primary-pressed': [P('backgroundColor', 'color', 'button.primary.bg.pressed')],
    'button-primary-disabled': [
      P('backgroundColor', 'color', 'buttonB.primary.bgDisabled'),
      P('textColor', 'color', 'buttonB.primary.fgDisabled'),
    ],
    'button-secondary': [
      P('backgroundColor', 'color', 'buttonB.secondary.bg'),
      P('textColor', 'color', 'buttonB.secondary.fg'),
      P('rounded', 'rounded', 'buttonB.radius'),
      P('height', 'raw', 'buttonB.height.lg'),
      P('padding', 'spacing', 'buttonB.paddingX.lg'),
    ],
    input: [
      P('backgroundColor', 'color', 'input.bg.default'),
      P('textColor', 'color', 'input.fg'),
      P('rounded', 'rounded', 'input.radius'),
      P('height', 'raw', 'input.height'),
      P('padding', 'spacing', 'input.paddingX'),
    ],
    'input-error': [P('textColor', 'color', 'input.errorText')],
    chip: [
      P('backgroundColor', 'color', 'chip.bg'),
      P('textColor', 'color', 'chip.fg'),
      P('rounded', 'rounded', 'badge.radius'),
    ],
    'badge-success': [
      P('backgroundColor', 'color', 'badge.success.bg'),
      P('textColor', 'color', 'badge.success.fg'),
      P('rounded', 'rounded', 'badge.radius'),
    ],
    'badge-warning': [
      P('backgroundColor', 'color', 'badge.warning.bg'),
      P('textColor', 'color', 'badge.warning.fg'),
      P('rounded', 'rounded', 'badge.radius'),
    ],
    'badge-danger': [
      P('backgroundColor', 'color', 'badge.danger.bg'),
      P('textColor', 'color', 'badge.danger.fg'),
      P('rounded', 'rounded', 'badge.radius'),
    ],
    'badge-info': [
      P('backgroundColor', 'color', 'badge.info.bg'),
      P('textColor', 'color', 'badge.info.fg'),
      P('rounded', 'rounded', 'badge.radius'),
    ],
    'badge-unknown': [
      P('backgroundColor', 'color', 'badge.unknown.bg'),
      P('textColor', 'color', 'badge.unknown.fg'),
      P('rounded', 'rounded', 'badge.radius'),
    ],
    'notice-banner': [
      P('backgroundColor', 'color', 'noticeBanner.info.bg'),
      P('rounded', 'rounded', 'noticeBanner.radius'),
      P('padding', 'spacing', 'noticeBanner.padding'),
    ],
    overlay: [
      P('backgroundColor', 'color', 'overlay.bg'),
      P('textColor', 'color', 'overlay.fg'),
      P('rounded', 'rounded', 'overlay.radius'),
    ],
    'segmented-control': [
      P('backgroundColor', 'color', 'segmented.bg'),
      P('textColor', 'color', 'segmented.fg'),
      P('rounded', 'rounded', 'segmented.radius'),
    ],
    skeleton: [P('backgroundColor', 'color', 'skeleton.bg'), P('rounded', 'rounded', 'skeleton.radius')],
  }
  const components = {}
  for (const [name, props] of Object.entries(C)) {
    components[name] = {}
    for (const [prop, kind, path, fixed] of props) {
      if (fixed) components[name][prop] = `{typography.${fixed}}`
      else if (kind === 'raw') components[name][prop] = raw(path)
      else components[name][prop] = ref(path, kind)
    }
  }

  // ---- YAML (own emitter: 2-level maps of scalars/maps only)
  const scalar = (v) => (typeof v === 'number' ? String(v) : q(v))
  const emit = (obj, ind = 0) =>
    Object.entries(obj)
      .map(([k, v]) => {
        const pad = ' '.repeat(ind)
        return v && typeof v === 'object' ? `${pad}${k}:\n${emit(v, ind + 2)}` : `${pad}${k}: ${scalar(v)}`
      })
      .join('\n')
  const head = {
    version: 'alpha',
    name: theme === 'dark' ? 'VaultMe (dark)' : 'VaultMe',
    description:
      'Self-custody wallet for the Ethereum Sepolia testnet. Shows account, network, asset, recipient, amount, fee and status before signing.',
  }
  const out =
    emit(head) +
    '\n' +
    emit({ colors: colorOut }) +
    '\n' +
    emit({ typography }) +
    '\n' +
    emit({ rounded }) +
    '\n' +
    emit({ spacing }) +
    '\n' +
    emit({ components })
  return `---\n${out}\n---\n`
}

// Replace the leading --- block of DESIGN.md with fresh front matter.
export const withFrontMatter = (doc, fm) => fm + doc.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')

if (process.argv.includes('--write')) {
  const fm = frontMatter(JSON.parse(readFileSync(tokensPath, 'utf8')))
  writeFileSync(designPath, withFrontMatter(readFileSync(designPath, 'utf8'), fm))
}
