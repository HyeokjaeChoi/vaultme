import { expect, it } from 'vitest'
import { addressA11yLabel, diffGroups, groupAddress } from '../src/shared/lib/address'

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
