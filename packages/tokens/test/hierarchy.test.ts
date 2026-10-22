import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

// Primitive → Semantic → Component: raw values live only in Primitive; every other layer aliases.
type Node = { value?: unknown; type?: string; [k: string]: unknown }
const source = JSON.parse(readFileSync(resolve(__dirname, '../../../outputs/wallet-foundation.tokens.json'), 'utf8')) as Record<string, Node>

const leaves = (n: Node, path: string[] = []): [string, unknown][] =>
  'value' in n && 'type' in n
    ? [[path.join('.'), n.value]]
    : Object.entries(n).flatMap(([k, c]) => (k.startsWith('$') || typeof c !== 'object' || c === null ? [] : leaves(c as Node, [...path, k])))

it.each(['semantic', 'semanticDark', 'component'])('%s values are aliases only', (layer) => {
  const raw = leaves(source[layer]!).filter(([, v]) => !(typeof v === 'string' && /^\{[^{}]+\}$/.test(v)))
  expect(raw).toEqual([])
})
