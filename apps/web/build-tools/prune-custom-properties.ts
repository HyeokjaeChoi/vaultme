import postcss from 'postcss'
import type { Plugin } from 'vite'

// tokens.css defines ~1,500 custom properties (Primitive, Semantic, Component, light + dark). A page uses a few dozen.
// Dropping the unreferenced ones takes the render-blocking stylesheet from ~28 KB to a few KB gzip, which is most of
// the First Contentful Paint on slow 4G (Lighthouse). A property stays if a normal declaration reads it through var(),
// directly or through other custom properties. Tailwind's own `--tw-*` properties always stay.
const VAR = /var\(\s*(--[\w-]+)/g
const refs = (value: string) => [...value.matchAll(VAR)].flatMap((m) => (m[1] ? [m[1]] : []))

export function pruneCustomProperties(css: string): string {
  const root = postcss.parse(css)
  const deps = new Map<string, Set<string>>() // custom property -> properties its values read
  const roots = new Set<string>() // properties read by normal declarations
  root.walkDecls((d) => {
    if (d.prop.startsWith('--')) {
      const set = deps.get(d.prop) ?? new Set()
      refs(d.value).forEach((r) => set.add(r))
      deps.set(d.prop, set)
    } else refs(d.value).forEach((r) => roots.add(r))
  })
  const used = new Set<string>()
  const visit = (name: string) => {
    if (used.has(name)) return
    used.add(name)
    deps.get(name)?.forEach(visit)
  }
  roots.forEach(visit)
  root.walkDecls((d) => {
    if (d.prop.startsWith('--') && !d.prop.startsWith('--tw-') && !used.has(d.prop)) d.remove()
  })
  // Rules and at-rules left empty by the removal. Parents are emptied only after their children go, so repeat.
  let removed = true
  while (removed) {
    removed = false
    root.walk((n) => {
      if (
        (n.type === 'rule' || n.type === 'atrule') &&
        n.nodes?.length === 0 &&
        !(n.type === 'atrule' && n.name === 'font-face')
      ) {
        n.remove()
        removed = true
      }
    })
  }
  return root.toString()
}

export function pruneCustomPropertiesPlugin(): Plugin {
  return {
    name: 'vaultme:prune-custom-properties',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css') && typeof file.source === 'string') {
          file.source = pruneCustomProperties(file.source)
        }
      }
    },
  }
}
