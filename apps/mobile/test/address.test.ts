import { expect, it } from 'vitest'
import { addressA11yLabel, diffGroups, displayGroups, groupAddress, shortAddress } from '../src/shared/lib/address'

const A = '0x1111222233334444555566667777888899990000'
it('groups into 4 chars with the 0x prefix on the first group', () => {
  const g = groupAddress(A)
  expect(g[0]).toBe('0x1111')
  expect(g).toHaveLength(10)
  expect(g.slice(1).every((x) => x.length === 4)).toBe(true)
})
it('a11y label reads 4-char groups', () => {
  expect(addressA11yLabel(A).startsWith('0 x 1 1 1 1, 2 2 2 2')).toBe(true)
})
it('finds only the differing groups, case-insensitive', () => {
  const B = '0x1111222233334444AAAA66667777888899990000'
  expect(diffGroups(A, B)).toEqual([4])
  expect(diffGroups(A, A.toUpperCase().replace('0X', '0x'))).toEqual([])
})
it('lookalike with two changed chunks marks exactly those two', () => {
  const x = '0x9F3c7A210bD5e6C955a13F90c2E78d16Ab0441aB'
  const y = '0x9F3c7A210bD4e6C855a13F90c2E78d16Ab0441aB'
  expect(diffGroups(x, y)).toEqual([2, 3])
})

it('shows an address in EIP-55 form, leaves hashes alone', () => {
  const lower = '0x9f3c7a210bd4e6c855a13f90c2e78d16ab0441ab'
  expect(displayGroups(lower).join('')).not.toBe(lower)
  expect(displayGroups(lower).join('').toLowerCase()).toBe(lower)
  // vector from the EIP-55 spec
  expect(displayGroups('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed').join('')).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
  expect(shortAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')).toBe('0x5aAe…eAed')
  const hash = '0x' + 'ab'.repeat(32)
  expect(shortAddress(hash)).toBe('0xabab…abab')
})

it('fixture recipients are valid EIP-55 addresses, so captures match the checksum display', async () => {
  const { review, recentExamples } = await import('../src/entities/transaction/fixtures')
  const { toChecksumAddress } = await import('@vaultme/wallet-core')
  // Checksum from the lowercase form: a wrongly mixed-case fixture would not round-trip.
  for (const a of [review.recipient, ...recentExamples.map((r) => r.address)]) expect(toChecksumAddress(a.toLowerCase())).toBe(a)
})
