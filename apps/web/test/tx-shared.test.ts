import { describe, expect, it } from 'vitest'
import { rowShareNames, txShareName } from '../app/shared/ui/TxShared'

const H = `0x${'1'.repeat(64)}`

describe('rowShareNames', () => {
  it('names the first row of a hash and asset, then no later one (two boxes with one name end a view transition)', () => {
    const name = rowShareNames()
    expect(name(H, 'USDC', 'amount')).toBe(txShareName(H, 'USDC', 'amount'))
    expect(name(H, 'USDC', 'amount')).toBeUndefined()
    expect(name(H, 'USDC', 'status')).toBe(txShareName(H, 'USDC', 'status')) // another part is its own name
  })
  it('keeps an ETH row and a USDC row of one hash apart', () => {
    const name = rowShareNames()
    expect(name(H, 'ETH', 'amount')).not.toBe(name(H, 'USDC', 'amount'))
  })
  it('starts again on the next render', () => {
    expect(rowShareNames()(H, 'ETH', 'status')).toBe(txShareName(H, 'ETH', 'status'))
    expect(rowShareNames()(H, 'ETH', 'status')).toBe(txShareName(H, 'ETH', 'status'))
  })
})
