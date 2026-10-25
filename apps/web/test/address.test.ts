import { describe, expect, it } from 'vitest'
import { parseAddress } from '../app/shared/lib/address'

// Public test vector address (BIP39 "abandon ... about", account 0), EIP-55 form.
const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

describe('parseAddress', () => {
  it('accepts the EIP-55 form and returns it', () => {
    expect(parseAddress(A)).toBe(A)
  })
  it('accepts an all-lowercase or all-uppercase address (no checksum) and returns the EIP-55 form', () => {
    expect(parseAddress(A.toLowerCase())).toBe(A)
    expect(parseAddress(`0x${A.slice(2).toUpperCase()}`)).toBe(A)
  })
  it('ignores spaces around a pasted address', () => {
    expect(parseAddress(`  ${A}\n`)).toBe(A)
  })
  it('rejects a mixed-case address whose checksum does not match', () => {
    expect(parseAddress(A.replace('EfFD', 'efFD'))).toBeNull()
  })
  it('rejects wrong length, missing 0x, non-hex and ENS names', () => {
    for (const bad of ['', '0x1234abcd', A.slice(2), `${A}0`, `0x${'g'.repeat(40)}`, 'vitalik.eth']) {
      expect(parseAddress(bad)).toBeNull()
    }
  })
})
