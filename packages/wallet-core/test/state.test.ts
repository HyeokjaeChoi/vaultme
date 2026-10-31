import { describe, expect, test } from 'vitest'
import { deriveState, isFinal, isPolled, type TxFacts, type TxReceipt, type TxStatus } from '../src'

const ok = (n: bigint): TxReceipt => ({ status: 'success', blockNumber: n })
const bad = (n: bigint): TxReceipt => ({ status: 'reverted', blockNumber: n })
const f = (over: Partial<TxFacts>) =>
  deriveState({ current: 'Pending', nonce: 5, receipt: null, safeBlock: null, safeNonce: null, ...over })

describe('deriveState (ARCHITECTURE.md#invariants, ADR-0006)', () => {
  test('receipt above the safe block = Included, success or reverted', () => {
    expect(f({ receipt: ok(101n), safeBlock: 100n })).toBe('Included')
    expect(f({ receipt: bad(101n), safeBlock: 100n })).toBe('Included')
  })
  test('receipt at or below the safe block: success = Confirmed, reverted = Failed', () => {
    expect(f({ receipt: ok(100n), safeBlock: 100n })).toBe('Confirmed')
    expect(f({ receipt: ok(7n), safeBlock: 100n })).toBe('Confirmed')
    expect(f({ receipt: bad(100n), safeBlock: 100n })).toBe('Failed')
  })
  test('no safe block known = never final', () => {
    expect(f({ receipt: ok(1n), safeBlock: null })).toBe('Included')
  })
  test('a reverted receipt is not Failed before safe', () => {
    expect(f({ current: 'Included', receipt: bad(101n), safeBlock: 100n })).toBe('Included')
  })
  test('Unknown becomes Included/Confirmed when a receipt shows up', () => {
    expect(f({ current: 'Unknown', receipt: ok(101n), safeBlock: 100n })).toBe('Included')
    expect(f({ current: 'Unknown', receipt: ok(90n), safeBlock: 100n })).toBe('Confirmed')
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
      expect(f({ current: s, receipt: bad(1n), safeBlock: 100n, safeNonce: 99n })).toBe(s)
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
