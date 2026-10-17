import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// recents.ts pulls in the router and the encrypted kv; only the pure merge is under test.
vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }))
vi.mock('@/shared/storage', () => ({ addRecent: () => undefined, getRecents: () => [], MAX_RECENTS: 3 }))
vi.mock('@/shared/chain', () => ({ chain: { broadcasts: false } }))

import { mergeRecents } from '../src/features/send/model/recents'

const r = (address: string, at: number) => ({ address, at, asset: 'ETH', amount: '0.1' })
const A = '0x1111111111111111111111111111111111111111'
const B = '0x2222222222222222222222222222222222222222'
const C = '0x3333333333333333333333333333333333333333'
const D = '0x4444444444444444444444444444444444444444'

describe('mergeRecents', () => {
  it('puts this device\'s own sends first, then fills with examples', () => {
    expect(mergeRecents([r(A, 3)], [r(B, 2), r(C, 1)]).map((x) => x.address)).toEqual([A, B, C])
  })

  it('drops an example with the same address as a local send (case-insensitive)', () => {
    const merged = mergeRecents([r(A, 3)], [r(A.toUpperCase().replace('0X', '0x'), 2), r(B, 1)])
    expect(merged.map((x) => x.address)).toEqual([A, B])
  })

  it('keeps at most 3', () => {
    expect(mergeRecents([r(A, 4), r(B, 3)], [r(C, 2), r(D, 1)])).toHaveLength(3)
  })

  it('returns only examples when nothing was sent, and nothing when both are empty', () => {
    expect(mergeRecents([], [r(B, 1)]).map((x) => x.address)).toEqual([B])
    expect(mergeRecents([], [])).toEqual([])
  })
})

describe('recents only hold addresses this wallet signed and sent to (analyst R4)', () => {
  it('real chain: examples never appear, only local sends', async () => {
    const { recentsFor } = await import('../src/features/send/model/recents')
    expect(recentsFor([r(A, 1)], true).map((x) => x.address)).toEqual([A])
    expect(recentsFor([], true)).toEqual([])
  })

  it('fake chain: examples only fill after local sends', async () => {
    const { recentsFor } = await import('../src/features/send/model/recents')
    expect(recentsFor([r(A, 1)], false)[0]?.address).toBe(A)
  })

  it('the only writers are rememberRecipient (called by Review after a send) and the kv helper', () => {
    const src = fileURLToPath(new URL('../src', import.meta.url))
    const hits: string[] = []
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.tsx?$/.test(e.name) && /\b(addRecent|rememberRecipient)\(/.test(readFileSync(p, 'utf8'))) hits.push(relative(src, p))
      }
    }
    walk(src)
    expect(hits.sort()).toEqual(['features/send/model/recents.ts', 'pages/review/index.tsx', 'shared/storage/kv.ts'])
  })
})
