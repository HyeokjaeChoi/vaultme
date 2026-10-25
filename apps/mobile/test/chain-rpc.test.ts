import { BALANCE_OF_SELECTOR, USDC_SEPOLIA } from '@vaultme/contracts'
import { Mnemonic, prepare, txHash, type Hex } from '@vaultme/wallet-core'
import { describe, expect, it, vi } from 'vitest'
import { RpcError } from '@vaultme/api-client'
import { runSend, type SendDeps } from '../src/features/send/model/runSend'
import { createRpcChain, type RpcCall } from '../src/shared/chain/real'

// Published BIP39 test vector (all-zero entropy). Not a wallet phrase.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const FROM = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const TO = '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab'
const ETH = 10n ** 18n

type Call = [string, unknown[]]
function node(over: Partial<Record<string, (p: unknown[]) => unknown>> = {}) {
  const calls: Call[] = []
  const answers: Record<string, (p: unknown[]) => unknown> = {
    eth_getBalance: () => '0x' + (2n * ETH).toString(16),
    eth_call: () => '0x' + 5_000_000n.toString(16),
    eth_getTransactionCount: () => '0x7',
    eth_estimateGas: () => '0x5208',
    eth_feeHistory: () => ({ baseFeePerGas: ['0x1', '0x59682f00'], gasUsedRatio: [0.5] }), // next block base fee 1.5 gwei
    eth_maxPriorityFeePerGas: () => '0x1dcd6500', // 0.5 gwei
    ...over,
  }
  const rpc: RpcCall = (m, p) => {
    calls.push([m, p])
    const a = answers[m]
    if (!a) return Promise.reject(new Error('no answer for ' + m))
    return Promise.resolve(a(p))
  }
  return { rpc, calls }
}
const pad = (h: string) => h.replace(/^0x/, '').toLowerCase().padStart(64, '0')

describe('real ChainPort', () => {
  it('is a broadcasting adapter', () => {
    expect(createRpcChain(node().rpc).broadcasts).toBe(true)
  })

  it('getBalances: eth_getBalance and USDC balanceOf via eth_call', async () => {
    const n = node()
    expect(await createRpcChain(n.rpc).getBalances(FROM)).toEqual({ ETH: 2n * ETH, USDC: 5_000_000n })
    expect(n.calls).toContainEqual(['eth_getBalance', [FROM, 'latest']])
    expect(n.calls).toContainEqual([
      'eth_call',
      [{ to: USDC_SEPOLIA, data: `${BALANCE_OF_SELECTOR}${pad(FROM)}` }, 'latest'],
    ])
  })

  it('getSnapshot ETH: request shapes and parsing', async () => {
    const n = node()
    const s = await createRpcChain(n.rpc).getSnapshot(FROM, 'ETH', TO, '0.5')
    expect(s).toEqual({
      nonce: 7,
      nativeBalance: 2n * ETH,
      tokenBalance: 5_000_000n,
      gasLimit: 21_000n,
      baseFeePerGas: 1_500_000_000n,
      maxPriorityFeePerGas: 500_000_000n,
    })
    expect(n.calls).toContainEqual(['eth_getTransactionCount', [FROM, 'pending']])
    expect(n.calls).toContainEqual(['eth_estimateGas', [{ from: FROM, to: TO, value: '0x' + (ETH / 2n).toString(16) }]])
    expect(n.calls).toContainEqual(['eth_feeHistory', [1, 'latest', []]])
    expect(n.calls).toContainEqual(['eth_maxPriorityFeePerGas', []])
    expect(n.calls).toHaveLength(6)
  })

  it('getSnapshot USDC: estimates transfer(to, amount) on the USDC contract, with 20% headroom', async () => {
    const n = node({ eth_estimateGas: () => '0xc350' }) // 50000
    const s = await createRpcChain(n.rpc).getSnapshot(FROM, 'USDC', TO, '1.5')
    expect(s.gasLimit).toBe(60_000n)
    expect(n.calls).toContainEqual([
      'eth_estimateGas',
      [{ from: FROM, to: USDC_SEPOLIA, data: `0xa9059cbb${pad(TO)}${pad(1_500_000n.toString(16))}` }],
    ])
  })

  it('a node that refuses to estimate gives the default limit; a transport failure still throws', async () => {
    const refuse = node({
      eth_estimateGas: () => {
        throw new RpcError(-32000, 'insufficient funds')
      },
    })
    expect((await createRpcChain(refuse.rpc).getSnapshot(FROM, 'ETH', TO, '99')).gasLimit).toBe(21_000n)
    const down = node({
      eth_estimateGas: () => {
        throw new Error('network')
      },
    })
    await expect(createRpcChain(down.rpc).getSnapshot(FROM, 'ETH', TO, '1')).rejects.toThrow('network')
  })

  it('bad node answers throw', async () => {
    await expect(
      createRpcChain(node({ eth_getBalance: () => 'nope' }).rpc).getSnapshot(FROM, 'ETH', TO, '1'),
    ).rejects.toThrow()
    await expect(
      createRpcChain(node({ eth_feeHistory: () => ({ baseFeePerGas: [] }) }).rpc).getSnapshot(FROM, 'ETH', TO, '1'),
    ).rejects.toThrow()
  })

  it('submit: eth_sendRawTransaction with the raw tx, returns the reported hash', async () => {
    const hash = '0x' + 'ab'.repeat(32)
    const n = node({ eth_sendRawTransaction: () => hash })
    expect(await createRpcChain(n.rpc).submit('0x02f8')).toBe(hash)
    expect(n.calls).toEqual([['eth_sendRawTransaction', ['0x02f8']]])
    await expect(createRpcChain(node({ eth_sendRawTransaction: () => 'bad' }).rpc).submit('0x02')).rejects.toThrow()
  })

  it('getReceipt: null until mined, then status and block', async () => {
    const h = ('0x' + 'cd'.repeat(32)) as `0x${string}`
    expect(await createRpcChain(node({ eth_getTransactionReceipt: () => null }).rpc).getReceipt(h)).toBeNull()
    const ok = node({ eth_getTransactionReceipt: () => ({ status: '0x1', blockNumber: '0x10' }) })
    expect(await createRpcChain(ok.rpc).getReceipt(h)).toEqual({ status: 'success', blockNumber: 16n })
    expect(ok.calls).toEqual([['eth_getTransactionReceipt', [h]]])
    expect(
      await createRpcChain(
        node({ eth_getTransactionReceipt: () => ({ status: '0x0', blockNumber: '0x10' }) }).rpc,
      ).getReceipt(h),
    ).toMatchObject({ status: 'reverted' })
  })
})

describe('send with the real adapter (ADR-0005 hash compare)', () => {
  async function send(reported: (raw: Hex) => string) {
    const n = node({ eth_sendRawTransaction: (p) => reported(p[0] as Hex) })
    const chain = createRpcChain(n.rpc)
    const snap = await chain.getSnapshot(FROM, 'ETH', TO, '0.5')
    const r = prepare({ asset: 'ETH', to: TO, amount: '0.5', previous: [] }, snap)
    if (!r.ok) throw new Error('prepare')
    const saved: unknown[] = []
    const d: SendDeps = {
      chain,
      loadPhrase: vi.fn(() => Promise.resolve({ status: 'ok' as const, mnemonic: new Mnemonic(VECTOR) })),
      readPending: () => null,
      savePending: (tx) => void saved.push(tx),
      now: () => 1,
      prompt: { title: 'a', cancel: 'c' },
    }
    return { out: await runSend(r.review, '0.5', FROM, d), saved, d }
  }

  it('node reports the hash we computed: Pending', async () => {
    const { out } = await send((raw) => txHash(raw))
    expect(out.status).toBe('Pending')
  })
  it('node reports another hash: Unknown, and we keep our own hash', async () => {
    const other = '0x' + '00'.repeat(32)
    const { out } = await send(() => other)
    expect(out.status).toBe('Unknown')
    if (out.status === 'Unknown') expect(out.tx.hash).not.toBe(other)
  })
  it('submit failure after signing: Unknown, never a clean failure', async () => {
    const { out } = await send(() => {
      throw new Error('boom')
    })
    expect(out.status).toBe('Unknown')
  })
})

describe('safe block and safe nonce (ADR-0006)', () => {
  it('getSafeBlock asks eth_getBlockByNumber("safe", false) and reads the number', async () => {
    const n = node({ eth_getBlockByNumber: () => ({ number: '0x64', hash: '0x1' }) })
    expect(await createRpcChain(n.rpc).getSafeBlock()).toBe(100n)
    expect(n.calls).toEqual([['eth_getBlockByNumber', ['safe', false]]])
  })
  it('getSafeBlock rejects a null block', async () => {
    await expect(createRpcChain(node({ eth_getBlockByNumber: () => null }).rpc).getSafeBlock()).rejects.toThrow()
  })
  it('getSafeNonce asks the transaction count at "safe"', async () => {
    const n = node({ eth_getTransactionCount: () => '0x9' })
    expect(await createRpcChain(n.rpc).getSafeNonce(FROM)).toBe(9n)
    expect(n.calls).toEqual([['eth_getTransactionCount', [FROM, 'safe']]])
  })
})
