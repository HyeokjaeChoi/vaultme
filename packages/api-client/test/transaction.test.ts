import { describe, expect, it } from 'vitest'
import { readInternalTransfers, readTransaction } from '../src/index.ts'

const HASH = `0x${'8f'.repeat(32)}`
const FROM = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const TO = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const eth = { hash: HASH, from: FROM, to: TO, value: '0xb1a2bc2ec50000', input: '0x', blockNumber: '0x713a27' } // 0.05 ETH
const receipt = {
  status: '0x1',
  gasUsed: '0x5208',
  effectiveGasPrice: '0x3b9aca00',
  blockNumber: '0x713a27',
  transactionHash: HASH,
}
const block = { number: '0x713a27', timestamp: '0x68fc4f00' }
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const word = (a: string) => `0x${a.slice(2).toLowerCase().padStart(64, '0')}`
const usdcLog = (o: Record<string, unknown> = {}) => ({
  address: USDC.toLowerCase(),
  topics: [TRANSFER_TOPIC, word(FROM), word(TO)],
  data: `0x${7_500_000n.toString(16).padStart(64, '0')}`,
  ...o,
})

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

  it('a USDC transfer with extra call data bytes is still the transfer (an ABI decoder ignores the tail)', async () => {
    const input = `0xa9059cbb${TO.slice(2).toLowerCase().padStart(64, '0')}${1_000_000n.toString(16).padStart(64, '0')}00ff`
    const { rpc } = chain({ tx: { ...eth, to: USDC, value: '0x0', input } })
    expect(await readTransaction(rpc, HASH)).toMatchObject({ asset: 'USDC', amount: 1_000_000n })
  })

  it('a USDC move through another call (transferFrom, a router) is the one USDC Transfer log of the receipt', async () => {
    const log = usdcLog
    const via = { ...eth, to: `0x${'11'.repeat(20)}`, value: '0x0', input: '0x23b872dd00' }
    const one = chain({ tx: via, receipt: { ...receipt, logs: [log(), log({ address: `0x${'22'.repeat(20)}` })] } })
    expect(await readTransaction(one.rpc, HASH)).toMatchObject({
      asset: 'USDC',
      amount: 7_500_000n,
      from: FROM.toLowerCase(),
      to: TO.toLowerCase(),
    })
    // Two USDC legs: which one the page means is unclear, so it shows the call itself (its ETH value).
    const two = chain({ tx: via, receipt: { ...receipt, logs: [log(), log()] } })
    expect(await readTransaction(two.rpc, HASH)).toMatchObject({ asset: 'ETH', amount: 0n })
  })

  it('reads upper-case hex (selector and Transfer topic) like lower-case', async () => {
    const input = `0xA9059CBB${TO.slice(2).padStart(64, '0')}${1_000_000n.toString(16).padStart(64, '0')}`
    const call = chain({ tx: { ...eth, to: USDC, value: '0x0', input } })
    expect(await readTransaction(call.rpc, HASH)).toMatchObject({ asset: 'USDC', amount: 1_000_000n })
    const via = { ...eth, to: `0x${'11'.repeat(20)}`, value: '0x0' }
    const topics = [TRANSFER_TOPIC.toUpperCase().replace('0X', '0x'), word(FROM), word(TO)]
    const log = chain({ tx: via, receipt: { ...receipt, logs: [usdcLog({ topics })] } })
    expect(await readTransaction(log.rpc, HASH)).toMatchObject({ asset: 'USDC', amount: 7_500_000n })
  })

  it('a blob transaction pays its blob gas too', async () => {
    const { rpc } = chain({ receipt: { ...receipt, blobGasUsed: '0x20000', blobGasPrice: '0x2' } })
    expect((await readTransaction(rpc, HASH))?.fee).toBe(21_000_000_000_000n + 0x20000n * 2n)
  })

  it.each([['blobGasUsed'], ['blobGasPrice']])('a receipt with only %s is a bad receipt', async (only) => {
    const { rpc } = chain({ receipt: { ...receipt, [only]: '0x1' } })
    await expect(readTransaction(rpc, HASH)).rejects.toThrow()
  })

  it('the ETH history row of a transaction with a USDC log shows the ETH move, the USDC row the USDC one', async () => {
    const via = { ...eth, to: `0x${'11'.repeat(20)}`, input: '0x23b872dd00' }
    const { rpc } = chain({ tx: via, receipt: { ...receipt, logs: [usdcLog()] } })
    expect(await readTransaction(rpc, HASH, 'ETH')).toMatchObject({
      asset: 'ETH',
      amount: 50_000_000_000_000_000n,
      from: FROM,
    })
    expect(await readTransaction(rpc, HASH, 'USDC')).toMatchObject({ asset: 'USDC', amount: 7_500_000n })
    expect(await readTransaction(rpc, HASH)).toMatchObject({ asset: 'USDC' })
  })

  it('a missing call data field is a plain ETH transfer', async () => {
    const { rpc } = chain({ tx: { ...eth, input: undefined } })
    expect(await readTransaction(rpc, HASH)).toMatchObject({ asset: 'ETH', amount: 50_000_000_000_000_000n })
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
    // A node that is behind the one that answered the receipt has no such block yet: not "failed", the same wait.
    expect(await readTransaction(chain({ block: null }).rpc, HASH)).toBeNull()
  })

  it.each([
    ['no from', { tx: { ...eth, from: undefined } }],
    ['an array for an object', { tx: [eth] }],
    ['a bad value', { tx: { ...eth, value: '5' } }],
    ['a bad receipt', { receipt: { ...receipt, gasUsed: 'x' } }],
    ['a bad timestamp', { block: { ...block, timestamp: 'x' } }],
    ['a timestamp no Date can hold', { block: { ...block, timestamp: '0xffffffffffffff' } }],
    ['another transaction', { tx: { ...eth, hash: `0x${'11'.repeat(32)}` } }],
    ['another receipt', { receipt: { ...receipt, transactionHash: `0x${'11'.repeat(32)}` } }],
    ['no receipt hash', { receipt: { ...receipt, transactionHash: undefined } }],
    ['no receipt status', { receipt: { ...receipt, status: undefined } }],
    ['an unknown receipt status', { receipt: { ...receipt, status: '0x2' } }],
    ['a transaction in another block', { tx: { ...eth, blockNumber: '0x713a28' } }],
    ['a block that is not the receipt block', { block: { ...block, number: '0x713a28' } }],
    [
      'a short Transfer topic',
      { receipt: { ...receipt, logs: [usdcLog({ topics: [TRANSFER_TOPIC, '0x01', word(TO)] })] } },
    ],
    [
      'a non-hex Transfer topic',
      { receipt: { ...receipt, logs: [usdcLog({ topics: [TRANSFER_TOPIC, word(FROM), 'zz'.repeat(32)] })] } },
    ],
    [
      'a non-string Transfer topic',
      { receipt: { ...receipt, logs: [usdcLog({ topics: [TRANSFER_TOPIC, word(FROM), 7] })] } },
    ],
  ])('throws on %s', async (_n, o) => {
    await expect(readTransaction(chain(o).rpc, HASH)).rejects.toThrow()
  })
})

describe('readInternalTransfers', () => {
  const item = { from: FROM.toLowerCase(), to: TO.toLowerCase(), value: '50000000000000000', ok: true }

  it('asks by hash and returns the items with wei as bigint, in order', async () => {
    const calls: string[] = []
    const items = await readInternalTransfers((h) => {
      calls.push(h)
      return Promise.resolve({ items: [item, { ...item, to: null, value: '0', ok: false }] })
    }, HASH)
    expect(calls).toEqual([HASH])
    expect(items).toEqual([
      { ...item, value: 50_000_000_000_000_000n },
      { ...item, to: null, value: 0n, ok: false },
    ])
  })

  it('no items is an empty list', async () => {
    expect(await readInternalTransfers(() => Promise.resolve({ items: [] }), HASH)).toEqual([])
  })

  it.each([
    ['no items', {}],
    ['a bad value', { items: [{ ...item, value: '0x5' }] }],
    ['a bad address', { items: [{ ...item, from: 'x' }] }],
    ['no ok', { items: [{ ...item, ok: undefined }] }],
  ])('throws on %s', async (_n, answer) => {
    await expect(readInternalTransfers(() => Promise.resolve(answer), HASH)).rejects.toThrow()
  })

  it('passes a failed call on', async () => {
    await expect(readInternalTransfers(() => Promise.reject(new Error('503')), HASH)).rejects.toThrow('503')
  })
})
