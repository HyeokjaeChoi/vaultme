import { describe, expect, test } from 'vitest'
import { ASSETS, BURN_ADDRESSES, recipientRisk } from '../src'
import { OTHER, RECIPIENT } from './fixtures'

const USDC = ASSETS.USDC.address
// Same first 4 and last 4 hex chars as RECIPIENT (70997970 ... 79C8), different middle.
const LOOKALIKE = '0x7099aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa79C8' as const

describe('recipientRisk', () => {
  test('known / first', () => {
    expect(recipientRisk(RECIPIENT, [RECIPIENT])).toBe('known')
    expect(recipientRisk(RECIPIENT, [])).toBe('first')
    expect(recipientRisk(RECIPIENT, [OTHER])).toBe('first')
  })
  test('case-insensitive', () => {
    expect(recipientRisk(RECIPIENT.toLowerCase() as `0x${string}`, [RECIPIENT])).toBe('known')
    expect(recipientRisk(USDC.toLowerCase() as `0x${string}`, [])).toBe('tokenContract')
    expect(recipientRisk(BURN_ADDRESSES[1].toLowerCase() as `0x${string}`, [])).toBe('burn')
  })
  test('lookalike: same first 4 + last 4, different address', () => {
    expect(recipientRisk(LOOKALIKE, [RECIPIENT])).toBe('lookalike')
    expect(recipientRisk(LOOKALIKE.toUpperCase().replace('0X', '0x') as `0x${string}`, [RECIPIENT])).toBe('lookalike')
  })
  test('different last 4 is not lookalike', () => {
    expect(recipientRisk('0x7099aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa79C9', [RECIPIENT])).toBe('first')
  })
  test('burn and USDC contract', () => {
    for (const b of BURN_ADDRESSES) expect(recipientRisk(b, [b])).toBe('burn')
    expect(recipientRisk(USDC, [])).toBe('tokenContract')
  })
  test('priority: burn > tokenContract > lookalike > first/known', () => {
    // burn lookalike of an earlier burn-ish address still reports burn
    expect(recipientRisk(BURN_ADDRESSES[0], [BURN_ADDRESSES[1]])).toBe('burn')
    // token contract that is also a lookalike of a previous entry
    const near = ('0x1c7D' + 'a'.repeat(32) + '7238') as `0x${string}`
    expect(recipientRisk(USDC, [near])).toBe('tokenContract')
    // known address that also lookalikes another previous address -> lookalike wins
    expect(recipientRisk(RECIPIENT, [RECIPIENT, LOOKALIKE])).toBe('lookalike')
  })
})
