import { describe, expect, it } from 'vitest'
import { rowShareNames, txShareName } from '../app/shared/ui/TxShared'

const H = `0x${'1'.repeat(64)}`
const G = `0x${'2'.repeat(64)}`

describe('rowShareNames', () => {
  it('names a hash and asset that appears once', () => {
    const name = rowShareNames([{ hash: H, asset: 'ETH' }])
    expect(name(H, 'ETH', 'amount')).toBe(txShareName(H, 'ETH', 'amount'))
    expect(name(H, 'ETH', 'status')).toBe(txShareName(H, 'ETH', 'status'))
  })
  it('names none of the rows of a repeated hash and asset (/tx cannot tell which row was opened)', () => {
    const name = rowShareNames([
      { hash: H, asset: 'USDC' },
      { hash: H, asset: 'USDC' },
      { hash: G, asset: 'USDC' },
    ])
    expect(name(H, 'USDC', 'amount')).toBeUndefined()
    expect(name(H, 'USDC', 'status')).toBeUndefined()
    expect(name(G, 'USDC', 'amount')).toBe(txShareName(G, 'USDC', 'amount'))
  })
  it('keeps an ETH row and a USDC row of one hash apart', () => {
    const name = rowShareNames([
      { hash: H, asset: 'ETH' },
      { hash: H, asset: 'USDC' },
    ])
    expect(name(H, 'ETH', 'amount')).not.toBe(name(H, 'USDC', 'amount'))
    expect(name(H, 'ETH', 'amount')).toBeDefined()
  })
})
