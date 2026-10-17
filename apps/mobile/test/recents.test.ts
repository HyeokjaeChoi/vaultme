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
