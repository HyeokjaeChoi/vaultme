import { describe, expect, it } from 'vitest'
import {
  TRANSFER_TOPIC,
  checkRelease,
  expectedAmounts,
  findSenderTxs,
  type Expected,
  type Rpc,
  type RpcReceipt,
  type RpcTx,
  type SentTx,
} from '../../../scripts/release-verify.mts'

// CHAIN-1 (ADR-0040): the on-chain check after the funded release flows. Fixed fake addresses and numbers; no network.
const SENDER = '0x1111111111111111111111111111111111111111'
const RECEIVER = '0x2222222222222222222222222222222222222222'
const OTHER = '0x3333333333333333333333333333333333333333'
const TOKEN = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const CAP = 5_000_000_000_000_000n // 0.005 ETH, ABS_MAX_FEE_WEI
const hex = (n: bigint | number) => `0x${n.toString(16)}`
const topic = (a: string) => `0x${a.slice(2).toLowerCase().padStart(64, '0')}`

const amounts = expectedAmounts('123', '45') // 0.000123 ETH, 0.45 USDC
const e: Expected = { sender: SENDER, receiver: RECEIVER, token: TOKEN, nonceBefore: 7, maxFeeWei: CAP, ...amounts }

const receipt = (over: Partial<RpcReceipt> = {}): RpcReceipt => ({
  status: '0x1',
  gasUsed: hex(21_000),
  effectiveGasPrice: hex(2_000_000_000),
  logs: [],
  ...over,
})
const transfer = (from: string, to: string, units: bigint, address = TOKEN) => ({
  address,
  topics: [TRANSFER_TOPIC, topic(from), topic(to)],
  data: `0x${units.toString(16).padStart(64, '0')}`,
})
const ethTx = (over: Partial<RpcTx> = {}): SentTx => ({
  tx: {
    hash: '0xe1',
    from: SENDER,
    to: RECEIVER,
    value: hex(amounts.ethWei),
    nonce: hex(7),
    blockNumber: hex(100),
    ...over,
  },
  receipt: receipt(),
})
const tokenTx = (over: { tx?: Partial<RpcTx>; receipt?: Partial<RpcReceipt> } = {}): SentTx => ({
  tx: { hash: '0xc2', from: SENDER, to: TOKEN, value: '0x0', nonce: hex(8), blockNumber: hex(130), ...over.tx },
  receipt: receipt({ logs: [transfer(SENDER, RECEIVER, amounts.tokenUnits)], ...over.receipt }),
})

describe('expectedAmounts', () => {
  it('turns the typed digits into base units', () => {
    expect(amounts).toEqual({ ethWei: 123_000_000_000_000n, tokenUnits: 450_000n })
    expect(expectedAmounts('101', '11')).toEqual({ ethWei: 101_000_000_000_000n, tokenUnits: 110_000n })
  })
  it('rejects a missing or malformed suffix', () => {
    expect(() => expectedAmounts('', '45')).toThrow()
    expect(() => expectedAmounts('12', '45')).toThrow()
    expect(() => expectedAmounts('123', '4')).toThrow()
    expect(() => expectedAmounts('12a', '45')).toThrow()
  })
})

describe('checkRelease', () => {
  it('passes when both sends match the chain', () => {
    expect(checkRelease(e, 9, [ethTx(), tokenTx()])).toEqual([])
  })
  it('accepts upper and lower case addresses', () => {
    const s = ethTx({ from: SENDER.toUpperCase().replace('0X', '0x'), to: RECEIVER.toUpperCase().replace('0X', '0x') })
    expect(checkRelease(e, 9, [s, tokenTx()])).toEqual([])
  })
  it('fails a duplicate broadcast (nonce delta 3) and a missing send (delta 1)', () => {
    expect(checkRelease(e, 10, [ethTx(), tokenTx()]).join()).toMatch(/moved by 3, expected exactly 2/)
    expect(checkRelease(e, 8, [ethTx()]).join()).toMatch(/moved by 1, expected exactly 2/)
  })
  it('fails when the sender has no txs on chain at all', () => {
    expect(checkRelease(e, 7, []).join()).toMatch(/moved by 0/)
  })
  it('fails a reverted tx', () => {
    expect(checkRelease(e, 9, [{ ...ethTx(), receipt: receipt({ status: '0x0' }) }, tokenTx()]).join()).toMatch(
      /ETH send: receipt status/,
    )
    expect(checkRelease(e, 9, [ethTx(), tokenTx({ receipt: { status: '0x0' } })]).join()).toMatch(
      /USDC send: receipt status/,
    )
  })
  it('fails a tx that has no receipt', () => {
    expect(checkRelease(e, 9, [ethTx(), { ...tokenTx(), receipt: null }]).join()).toMatch(/USDC send: no receipt/)
  })
  it('fails a wrong ETH recipient or value', () => {
    expect(checkRelease(e, 9, [ethTx({ to: OTHER }), tokenTx()]).join()).toMatch(/recipient is not the paired wallet/)
    expect(checkRelease(e, 9, [ethTx({ value: hex(amounts.ethWei + 1n) }), tokenTx()]).join()).toMatch(
      /ETH send: value/,
    )
  })
  it('fails a wrong nonce order', () => {
    expect(checkRelease(e, 9, [ethTx({ nonce: hex(8) }), tokenTx({ tx: { nonce: hex(7) } })]).join()).toMatch(
      /nonce 8, expected 7/,
    )
  })
  it('fails a fee above the cap, and accepts exactly the cap', () => {
    const fee = (wei: bigint) => receipt({ gasUsed: hex(1), effectiveGasPrice: hex(wei) })
    expect(checkRelease(e, 9, [{ ...ethTx(), receipt: fee(CAP + 1n) }, tokenTx()]).join()).toMatch(
      /ETH send: fee .* above the cap/,
    )
    expect(checkRelease(e, 9, [{ ...ethTx(), receipt: fee(CAP) }, tokenTx()])).toEqual([])
  })
  it('fails when the USDC tx does not call the token contract or also moves ETH', () => {
    expect(checkRelease(e, 9, [ethTx(), tokenTx({ tx: { to: OTHER } })]).join()).toMatch(
      /does not call the USDC contract/,
    )
    expect(checkRelease(e, 9, [ethTx(), tokenTx({ tx: { value: '0x1' } })]).join()).toMatch(/also moves ETH/)
  })
  it('fails a USDC Transfer log with another amount, receiver, sender, contract, or none', () => {
    const bad = (logs: ReturnType<typeof transfer>[]) =>
      checkRelease(e, 9, [ethTx(), tokenTx({ receipt: { logs } })]).join()
    expect(bad([transfer(SENDER, RECEIVER, amounts.tokenUnits + 1n)])).toMatch(/expected one Transfer log/)
    expect(bad([transfer(SENDER, OTHER, amounts.tokenUnits)])).toMatch(/expected one Transfer log/)
    expect(bad([transfer(OTHER, RECEIVER, amounts.tokenUnits)])).toMatch(/expected one Transfer log/)
    expect(bad([transfer(SENDER, RECEIVER, amounts.tokenUnits, OTHER)])).toMatch(/expected one Transfer log/)
    expect(bad([])).toMatch(/expected one Transfer log/)
  })
  it('fails when a second Transfer log hides next to the right one', () => {
    const logs = [transfer(SENDER, RECEIVER, amounts.tokenUnits), transfer(SENDER, OTHER, 1n)]
    expect(checkRelease(e, 9, [ethTx(), tokenTx({ receipt: { logs } })]).join()).toMatch(/found 1 of 2/)
  })
  it('fails when the chain holds more or fewer sender txs than 2', () => {
    expect(checkRelease(e, 9, [ethTx()]).join()).toMatch(/found 1 txs/)
    expect(checkRelease(e, 9, [ethTx(), tokenTx(), tokenTx()]).join()).toMatch(/found 3 txs/)
  })
})

// A fake chain: block n -> its txs. The scan reads full blocks, so it needs no archive state.
const chain = (blocks: Record<number, Partial<RpcTx>[]>): { rpc: Rpc; reads: number[] } => {
  const reads: number[] = []
  const rpc: Rpc = (method, params) => {
    if (method !== 'eth_getBlockByNumber') return Promise.reject(new Error(`unexpected ${method}`))
    const n = Number(BigInt(params[0] as string))
    reads.push(n)
    const txs = blocks[n]
    return Promise.resolve(txs ? { transactions: txs.map((t) => ({ from: OTHER, ...t })) } : null)
  }
  return { rpc, reads }
}

describe('findSenderTxs', () => {
  it('collects the sender txs in block order, skips other senders and stops at the count', async () => {
    const { rpc, reads } = chain({
      10: [{ from: OTHER, hash: '0xa' }],
      11: [{ from: OTHER }, { from: SENDER.toUpperCase().replace('0X', '0x'), hash: '0xb' }],
      12: [],
      13: [{ from: SENDER, hash: '0xc' }],
      14: [{ from: SENDER, hash: '0xd' }],
    })
    expect((await findSenderTxs(rpc, SENDER, 10, 2)).map((t) => t.hash)).toEqual(['0xb', '0xc'])
    expect(reads).toEqual([10, 11, 12, 13]) // block 14 is never read
  })
  it('stops at the chain head (a block that is not mined yet)', async () => {
    const { rpc, reads } = chain({ 5: [{ from: SENDER, hash: '0xa' }], 6: [] })
    expect((await findSenderTxs(rpc, SENDER, 5, 2)).map((t) => t.hash)).toEqual(['0xa'])
    expect(reads).toEqual([5, 6, 7])
  })
  it('reads at most `limit` blocks', async () => {
    const { rpc, reads } = chain(Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i, []])))
    expect(await findSenderTxs(rpc, SENDER, 0, 2, 3)).toEqual([])
    expect(reads).toEqual([0, 1, 2])
  })
})
