import { describe, expect, it } from 'vitest'
import { etherscanTx, parseTxHash, utcTime } from '../app/shared/lib/tx'

const H = `0x${'8F3b'.repeat(16)}`

describe('parseTxHash (the /tx fragment)', () => {
  it('accepts 0x + 64 hex in any case, trimmed, and returns it lower-case', () => {
    expect(parseTxHash(` ${H}\n`)).toBe(H.toLowerCase())
  })
  it.each(['', '0x', `0x${'a'.repeat(63)}`, `0x${'a'.repeat(65)}`, `0x${'g'.repeat(64)}`, 'a'.repeat(64), `${H}/x`])(
    'rejects %j',
    (v) => expect(parseTxHash(v)).toBeNull(),
  )
})

it('etherscanTx is the Sepolia explorer page of the hash', () => {
  expect(etherscanTx(H)).toBe(`https://sepolia.etherscan.io/tx/${H}`)
})

it('utcTime is the block time in UTC to the minute, as Figma "2026-10-25 04:12 UTC"', () => {
  expect(utcTime(Date.UTC(2026, 9, 25, 4, 12, 59))).toBe('2026-10-25 04:12 UTC')
})
