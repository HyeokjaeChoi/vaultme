import { describe, expect, it } from 'vitest'
import { readBalances } from '../src/index.ts'

const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

describe('readBalances', () => {
  it('reads ETH with eth_getBalance and Sepolia USDC with balanceOf, in base units', async () => {
    const calls: [string, unknown[]][] = []
    const rpc = (method: string, params: unknown[]) => {
      calls.push([method, params])
      return Promise.resolve(method === 'eth_getBalance' ? '0x11d448f27b93c000' : '0xbebc20')
    }
    expect(await readBalances(rpc, ADDRESS)).toEqual({ ETH: 1_284_732_000_000_000_000n, USDC: 12_500_000n })
    expect(calls).toEqual([
      ['eth_getBalance', [ADDRESS, 'latest']],
      [
        'eth_call',
        [
          {
            to: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            data: '0x70a082310000000000000000000000009858effd232b4033e47d90003d41ec34ecaeda94',
          },
          'latest',
        ],
      ],
    ])
  })
  it('rejects a result that is not a hex quantity', async () => {
    await expect(readBalances(() => Promise.resolve('12'), ADDRESS)).rejects.toThrow('rpc: bad quantity')
    await expect(readBalances(() => Promise.resolve(null), ADDRESS)).rejects.toThrow('rpc: bad quantity')
  })
})
