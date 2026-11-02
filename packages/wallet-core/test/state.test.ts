import { describe, expect, test } from 'vitest'
import { deriveState, isFinal, isPolled, minedIndex, type TxFacts, type TxReceipt, type TxStatus } from '../src'

const ok = (n: bigint): TxReceipt => ({ status: 'success', blockNumber: n })
const bad = (n: bigint): TxReceipt => ({ status: 'reverted', blockNumber: n })
const f = (over: Partial<TxFacts>) =>
  deriveState({ current: 'Pending', nonce: 5, receipts: [], safeBlock: null, safeNonce: null, ...over })

describe('deriveState (ARCHITECTURE.md#invariants, ADR-0006)', () => {
  test('receipt above the safe block = Included, success or reverted', () => {
    expect(f({ receipts: [ok(101n)], safeBlock: 100n })).toBe('Included')
    expect(f({ receipts: [bad(101n)], safeBlock: 100n })).toBe('Included')
  })
  test('receipt at or below the safe block: success = Confirmed, reverted = Failed', () => {
    expect(f({ receipts: [ok(100n)], safeBlock: 100n })).toBe('Confirmed')
    expect(f({ receipts: [ok(7n)], safeBlock: 100n })).toBe('Confirmed')
    expect(f({ receipts: [bad(100n)], safeBlock: 100n })).toBe('Failed')
  })
  test('no safe block known = never final', () => {
    expect(f({ receipts: [ok(1n)], safeBlock: null })).toBe('Included')
  })
  test('a reverted receipt is not Failed before safe', () => {
    expect(f({ current: 'Included', receipts: [bad(101n)], safeBlock: 100n })).toBe('Included')
  })
  test('Unknown becomes Included/Confirmed when a receipt shows up', () => {
    expect(f({ current: 'Unknown', receipts: [ok(101n)], safeBlock: 100n })).toBe('Included')
    expect(f({ current: 'Unknown', receipts: [ok(90n)], safeBlock: 100n })).toBe('Confirmed')
  })
  test('no receipt: time alone changes nothing, Pending and Unknown stay', () => {
    expect(f({})).toBe('Pending')
    expect(f({ current: 'Unknown' })).toBe('Unknown')
  })
  test('no receipt: safe nonce beyond ours = Replaced (ADR-0006); equal or below is not', () => {
    expect(f({ safeNonce: 6n })).toBe('Replaced')
    expect(f({ current: 'Unknown', safeNonce: 9n })).toBe('Replaced')
    expect(f({ safeNonce: 5n })).toBe('Pending')
    expect(f({ safeNonce: 4n })).toBe('Pending')
  })
  test('Included whose receipt is gone (reorg) goes back to Pending', () => {
    expect(f({ current: 'Included' })).toBe('Pending')
  })
  test('final states never move', () => {
    for (const s of ['Confirmed', 'Failed', 'Replaced'] as const)
      expect(f({ current: s, receipts: [bad(1n)], safeBlock: 100n, safeNonce: 99n })).toBe(s)
  })
})

describe('deriveState with replacements (ADR-0031)', () => {
  test('a receipt for any own hash decides, wherever it sits', () => {
    expect(f({ receipts: [null, ok(90n)], safeBlock: 100n })).toBe('Confirmed')
    expect(f({ receipts: [null, ok(101n)], safeBlock: 100n })).toBe('Included')
    expect(f({ receipts: [bad(90n), null], safeBlock: 100n })).toBe('Failed')
  })
  test('a mined original wins even when the safe nonce passed ours', () => {
    expect(f({ receipts: [ok(90n), null], safeBlock: 100n, safeNonce: 9n })).toBe('Confirmed')
  })
  test('Replaced only when no own hash has a receipt', () => {
    expect(f({ receipts: [null, null], safeNonce: 6n })).toBe('Replaced')
    expect(f({ receipts: [null, null], safeNonce: 5n })).toBe('Pending')
  })
})

describe('isPolled / isFinal', () => {
  const all: TxStatus[] = ['Pending', 'Included', 'Unknown', 'Confirmed', 'Failed', 'Replaced']
  test('only Pending and Included are polled', () => {
    expect(all.map(isPolled)).toEqual([true, true, false, false, false, false])
  })
  test('Confirmed, Failed, Replaced are final', () => {
    expect(all.map(isFinal)).toEqual([false, false, false, true, true, true])
  })
})

describe('deriveState with a cancel (ADR-0031)', () => {
  const c = (over: Partial<TxFacts>) => f({ cancelIndex: 1, ...over })
  test('a mined cancel at or below safe = Replaced', () => {
    expect(c({ receipts: [null, ok(90n)], safeBlock: 100n })).toBe('Replaced')
  })
  test('a mined cancel above safe stays Pending: no cancel claim before it is safe', () => {
    expect(c({ receipts: [null, ok(101n)], safeBlock: 100n })).toBe('Pending')
    expect(c({ receipts: [null, ok(1n)], safeBlock: null })).toBe('Pending')
  })
  test('the original mined first: the normal state, never Replaced', () => {
    expect(c({ receipts: [ok(90n), null], safeBlock: 100n })).toBe('Confirmed')
    expect(c({ receipts: [ok(101n), null], safeBlock: 100n })).toBe('Included')
    expect(c({ receipts: [bad(90n), null], safeBlock: 100n })).toBe('Failed')
  })
  test('with several hashes only the cancel index counts', () => {
    expect(f({ cancelIndex: 2, receipts: [null, ok(90n), null], safeBlock: 100n })).toBe('Confirmed') // a mined speed-up
    expect(f({ cancelIndex: 2, receipts: [null, null, ok(90n)], safeBlock: 100n })).toBe('Replaced')
  })
  test('no receipt: unchanged by a cancel', () => {
    expect(c({ receipts: [null, null] })).toBe('Pending')
    expect(c({ receipts: [null, null], safeNonce: 6n })).toBe('Replaced')
  })
  test('minedIndex names the own hash that has a receipt', () => {
    expect(minedIndex([null, null])).toBeNull()
    expect(minedIndex([null, ok(1n), null])).toBe(1)
  })
})
