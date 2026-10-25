import { describe, expect, it } from 'vitest'
import { readTransaction } from '../src/index.ts'

const HASH = `0x${'8f'.repeat(32)}`
const FROM = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const TO = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const eth = { hash: HASH, from: FROM, to: TO, value: '0xb1a2bc2ec50000', input: '0x' } // 0.05 ETH
const receipt = { status: '0x1', gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00', blockNumber: '0x713a27' }
const block = { timestamp: '0x68fc4f00' }

/** An rpc that answers the three reads and records the calls. */
const chain = (o: { tx?: unknown; receipt?: unknown; block?: unknown } = {}) => {
  const calls: [string, unknown[]][] = []
  const answers: Record<string, unknown> = {
    eth_getTransactionByHash: 'tx' in o ? o.tx : eth,
    eth_getTransactionReceipt: 'receipt' in o ? o.receipt : receipt,
    eth_getBlockByNumber: 'block' in o ? o.block : block,
  }
  const rpc = (method: string, params: unknown[]) => {
    calls.push([method, params])
    return Promise.resolve(answers[method])
  }
  return { rpc, calls }
}

describe('readTransaction', () => {
  it('reads an ETH transfer: parties, value, fee, block and block time', async () => {
    const { rpc, calls } = chain()
    expect(await readTransaction(rpc, HASH)).toEqual({
      hash: HASH,
      from: FROM,
      to: TO,
      asset: 'ETH',
      amount: 50_000_000_000_000_000n,
      ok: true,
      fee: 21_000_000_000_000n, // 21000 gas at 1 gwei
      block: 7_420_455n,
      at: 0x68fc4f00 * 1000,
    })
    expect(calls).toEqual([
      ['eth_getTransactionByHash', [HASH]],
      ['eth_getTransactionReceipt', [HASH]],
      ['eth_getBlockByNumber', ['0x713a27', false]],
    ])
  })

  it('reads a Sepolia USDC transfer from the call data: the recipient and amount are the arguments', async () => {
    const input = `0xa9059cbb${TO.slice(2).toLowerCase().padStart(64, '0')}${12_500_000n.toString(16).padStart(64, '0')}`
    const { rpc } = chain({ tx: { ...eth, to: USDC.toLowerCase(), value: '0x0', input } })
    expect(await readTransaction(rpc, HASH)).toMatchObject({ asset: 'USDC', amount: 12_500_000n, to: TO.toLowerCase() })
  })

  it('shows a call to another contract as its ETH value', async () => {
    const { rpc } = chain({ tx: { ...eth, to: `0x${'11'.repeat(20)}`, value: '0x0', input: '0xa9059cbb00' } })
    expect(await readTransaction(rpc, HASH)).toMatchObject({ asset: 'ETH', amount: 0n, to: `0x${'11'.repeat(20)}` })
  })

  it('a reverted transaction is not ok but keeps its fee', async () => {
    const { rpc } = chain({ receipt: { ...receipt, status: '0x0' } })
    expect(await readTransaction(rpc, HASH)).toMatchObject({ ok: false, fee: 21_000_000_000_000n })
  })

  it('a contract creation has no recipient', async () => {
    const { rpc } = chain({ tx: { ...eth, to: null } })
    expect((await readTransaction(rpc, HASH))?.to).toBeNull()
  })

  it('is null for an unknown hash and for one still waiting for a block', async () => {
    expect(await readTransaction(chain({ tx: null }).rpc, HASH)).toBeNull()
    const waiting = chain({ receipt: null })
    expect(await readTransaction(waiting.rpc, HASH)).toBeNull()
    expect(waiting.calls.map((c) => c[0])).not.toContain('eth_getBlockByNumber')
  })

  it.each([
    ['no from', { tx: { ...eth, from: undefined } }],
    ['a bad value', { tx: { ...eth, value: '5' } }],
    ['a bad receipt', { receipt: { ...receipt, gasUsed: 'x' } }],
    ['no block', { block: null }],
    ['a bad timestamp', { block: { timestamp: 'x' } }],
  ])('throws on %s', async (_n, o) => {
    await expect(readTransaction(chain(o).rpc, HASH)).rejects.toThrow()
  })
})
