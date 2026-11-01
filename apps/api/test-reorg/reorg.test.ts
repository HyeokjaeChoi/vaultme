import { env } from 'cloudflare:workers'
import { USDC_SEPOLIA } from '@vaultme/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { b64uEncode, nowSeconds } from '../src/auth.ts'
import { UpstreamError } from '../src/errors.ts'
import { AlchemyPayload, handleActivity } from '../src/push.ts'
import { ANVIL_PORT } from './anvil.ts'

// Reorg tests (#316, Q67). The Worker code runs unchanged; only `fetch` is stubbed (the seam push.test.ts uses): RPC
// upstream URLs go to a local anvil, Expo is counted. A reorg = `evm_snapshot` + `evm_revert`, then the chain is changed
// and the same tx (same hash: anvil signs deterministically) is mined again. anvil also has `anvil_reorg`; revert + re-send
// gives the same result and lets a test change state in between.
const anvilFetch = fetch // taken before the stub
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const E = {
  ...env,
  ALCHEMY_WEBHOOK_ID: 'wh_test',
  EXPO_ACCESS_TOKEN: rand(),
  INFURA_KEY: rand(),
  ALCHEMY_KEY: rand(),
  ANALYTICS: { writeDataPoint: () => undefined } as AnalyticsEngineDataset,
}
// anvil's first two dev accounts (public, test-only).
const A = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' // the subscribed address
const B = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
const FLAKY = '0x' + 'ee'.repeat(20) // contract: reverts while storage slot 0 is zero, else stops
const FLAKY_CODE = '0x600054600a57600080fd5b00'
const GAS_PRICE = '0x77359400'

const rpc = async (method: string, params: unknown[] = []): Promise<unknown> => {
  const res = await anvilFetch(`http://127.0.0.1:${String(ANVIL_PORT)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const j = await res.json<{ result?: unknown; error?: { message: string } }>()
  if (j.error) throw new Error(`${method}: ${j.error.message}`)
  return j.result
}
const receiptOf = async (hash: string) =>
  (await rpc('eth_getTransactionReceipt', [hash])) as { status: string; blockNumber: string } | null
/** Sends a tx and waits until anvil has mined it (anvil answers with the hash before the block is ready). */
const sendTx = async (to: string, value: string, gas = '0x5208', from = A): Promise<string> => {
  const hash = (await rpc('eth_sendTransaction', [{ from, to, value, gas, gasPrice: GAS_PRICE }])) as string
  for (let i = 0; i < 50 && !(await receiptOf(hash)); i++) await new Promise((r) => setTimeout(r, 20))
  return hash
}
/** A reorg: the chain goes back to `snap` and the txs after it are gone. */
const reorgTo = async (snap: string) => expect(await rpc('evm_revert', [snap])).toBe(true)
const setSlot = (v: number) =>
  rpc('anvil_setStorageAt', [FLAKY, '0x' + '00'.repeat(32), '0x' + v.toString(16).padStart(64, '0')])

type Act = Record<string, unknown>
const payload = (activity: Act[]) =>
  AlchemyPayload.parse({ webhookId: 'wh_test', type: 'ADDRESS_ACTIVITY', event: { network: 'ETH_SEPOLIA', activity } })
const eth = (hash: string, from: string, to: string, blockNum?: string): Act => ({
  hash,
  fromAddress: from,
  toAddress: to,
  value: 1e-18,
  asset: 'ETH',
  category: 'external',
  rawContract: { rawValue: '0x1' },
  ...(blockNum ? { blockNum } : {}),
})
const deliver = (activity: Act[]) => handleActivity(E, payload(activity))

let pushes: string[] // `kind` of each Expo message
let snap: string
beforeEach(async () => {
  pushes = []
  snap = (await rpc('evm_snapshot')) as string
  await rpc('anvil_setCode', [FLAKY, FLAKY_CODE])
  await setSlot(1)
  for (const t of ['push_sent', 'push_receipts', 'push_unregister', 'push_subscriptions', 'installs'])
    await E.DB.prepare(`DELETE FROM ${t}`).run()
  const id = crypto.randomUUID()
  await E.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .bind(id, 'k', nowSeconds(), nowSeconds())
    .run()
  await E.DB.prepare('INSERT INTO push_subscriptions (install_id, address, expo_token, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, A, 'ExponentPushToken[abcdefghijklmnop]', nowSeconds())
    .run()
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    if (url.startsWith('https://sepolia.infura.io/')) return anvilFetch(`http://127.0.0.1:${String(ANVIL_PORT)}`, init) // the RPC proxy's first upstream
    if (url === 'https://exp.host/--/api/v2/push/send') {
      const msgs = JSON.parse(init.body as string) as { data: { kind: string } }[]
      pushes.push(...msgs.map((m) => m.data.kind))
      return Promise.resolve(new Response(JSON.stringify({ data: msgs.map(() => ({ status: 'ok' })) })))
    }
    return Promise.reject(new Error('unexpected fetch'))
  })
})
afterEach(async () => {
  vi.unstubAllGlobals()
  await rpc('evm_revert', [snap]).catch(() => undefined) // a test may have used the snapshot already
})

describe('push after a reorg (anvil)', () => {
  it('own send: a reorged-out tx has no receipt, so no push and no claim; the re-mined tx pushes once', async () => {
    const base = (await rpc('evm_snapshot')) as string
    const hash = await sendTx(B, '0x1')
    await reorgTo(base)
    expect(await receiptOf(hash)).toBeNull()
    await expect(deliver([eth(hash, A, B)])).rejects.toBeInstanceOf(UpstreamError) // 5xx: Alchemy retries
    expect(pushes).toEqual([])
    expect((await E.DB.prepare('SELECT * FROM push_sent').all()).results).toHaveLength(0)
    expect(await sendTx(B, '0x1')).toBe(hash) // mined again
    await deliver([eth(hash, A, B)])
    expect(pushes).toEqual(['send'])
  })

  it('dedupe: the same tx re-mined in another block pushes once', async () => {
    const base = (await rpc('evm_snapshot')) as string
    const hash = await sendTx(B, '0x1')
    const first = await receiptOf(hash)
    await deliver([eth(hash, A, B, first?.blockNumber)])
    await reorgTo(base)
    await rpc('evm_mine')
    expect(await sendTx(B, '0x1')).toBe(hash)
    const second = await receiptOf(hash)
    expect(second?.blockNumber).not.toBe(first?.blockNumber)
    await deliver([eth(hash, A, B, second?.blockNumber)])
    expect(pushes).toEqual(['send'])
  })

  it('success, then a reorg turns the tx into a revert: `failed` is pushed too (#345)', async () => {
    const base = (await rpc('evm_snapshot')) as string
    const hash = await sendTx(FLAKY, '0x1', '0x30000')
    expect((await receiptOf(hash))?.status).toBe('0x1')
    await deliver([eth(hash, A, FLAKY)])
    expect(pushes).toEqual(['send'])
    await reorgTo(base)
    await setSlot(0) // the state differs after the reorg: the same tx now reverts
    expect(await sendTx(FLAKY, '0x1', '0x30000')).toBe(hash)
    expect((await receiptOf(hash))?.status).toBe('0x0')
    await deliver([eth(hash, A, FLAKY)])
    expect(pushes).toEqual(['send', 'failed']) // a sent push is not taken back (ADR-0010); the failure is new information (Q23, Q24)
  })

  it('a removed token log does not push', async () => {
    const hash = await sendTx(A, '0x1', '0x5208', B)
    await deliver([
      {
        hash,
        fromAddress: B,
        toAddress: A,
        value: 1,
        asset: 'USDC',
        category: 'token',
        rawContract: { address: USDC_SEPOLIA, rawValue: '0xf4240' },
        log: { removed: true },
      },
    ])
    expect(pushes).toEqual([])
  })

  // Known gap (#346): an incoming ETH leg has no `log`, so `removed` cannot mark it, and a deposit is not checked on the chain
  // (ADR-0023 reads receipts of own txs only). A deposit that was reorged out before the webhook is pushed. A sent push cannot be recalled (ADR-0010).
  it('known gap: a reorged-out incoming ETH deposit still pushes', async () => {
    const base = (await rpc('evm_snapshot')) as string
    const hash = await sendTx(A, '0x1', '0x5208', B)
    await reorgTo(base)
    expect(await receiptOf(hash)).toBeNull()
    await deliver([eth(hash, B, A)])
    expect(pushes).toEqual(['deposit'])
  })
  it.todo('does not push for a reorged-out incoming ETH deposit (#346)')
})
