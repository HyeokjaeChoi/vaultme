import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken } from '../src/auth.ts'
import { ANVIL_PORT } from './anvil.ts'

// CHAIN-8 (quality-gates plan): a resend through `/v1/rpc` is idempotent. After a timeout the proxy sends the same raw tx to the second
// upstream (rpc.ts: "After a failure it is safe to resend: the same raw tx has the same hash"). Here the first upstream is a local anvil that
// takes the tx and then fails the call; the second upstream is the same anvil. The Worker code runs unchanged; only `fetch` is stubbed.
const anvilFetch = fetch // taken before the stub
const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const E = {
  ...env,
  TOKEN_SECRET: rand() + rand(),
  INFURA_KEY: rand(),
  ALCHEMY_KEY: rand(),
  INSTALL_IP_LIMITER: open,
  INSTALL_LIMITER: open,
  RPC_IP_LIMITER: open,
}
type Reply = { result?: unknown; error?: { code: number; message: string } }
// anvil's first two dev accounts (public, test-only).
const A = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
const B = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'

const node = async (method: string, params: unknown[] = []): Promise<Reply> =>
  await anvilFetch(`http://127.0.0.1:${String(ANVIL_PORT)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }).then((r) => r.json<Reply>())
const ask = async (method: string, params: unknown[] = []): Promise<unknown> => {
  const j = await node(method, params)
  if (j.error) throw new Error(`${method}: ${j.error.message}`)
  return j.result
}
const nonce = async () => BigInt((await ask('eth_getTransactionCount', [A, 'latest'])) as string)
const balanceOfB = async () => BigInt((await ask('eth_getBalance', [B, 'latest'])) as string)

/** A signed transfer of 1 wei. anvil signs for its unlocked dev account, so the API package needs no signing library. */
const signed = async (): Promise<string> =>
  (await ask('eth_signTransaction', [
    {
      from: A,
      to: B,
      value: '0x1',
      gas: '0x5208',
      nonce: `0x${(await nonce()).toString(16)}`,
      maxFeePerGas: '0x77359400',
      maxPriorityFeePerGas: '0x3b9aca00',
      chainId: '0x7a69', // anvil's default chain id
    },
  ])) as string

const sendThroughProxy = async (raw: string): Promise<{ status: number; body: Reply }> => {
  const token = (await issueToken({ env: E } as never, crypto.randomUUID())).token
  const res = await app.request(
    '/v1/rpc',
    {
      method: 'POST',
      headers: { 'X-App-Version': '1.0.0', 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'eth_sendRawTransaction', params: [raw] }),
    },
    E,
  )
  return { status: res.status, body: await res.json<Reply>() }
}

let snap: string
let upstreamCalls: string[] // which upstream got each call
beforeEach(async () => {
  upstreamCalls = []
  snap = (await ask('evm_snapshot')) as string
})
afterEach(async () => {
  vi.unstubAllGlobals()
  await ask('evm_setAutomine', [true])
  await ask('evm_revert', [snap]).catch(() => undefined)
})

/** Infura takes the tx into anvil and then the call fails (a timeout or a 504 after the node accepted it); Alchemy is anvil too. */
function infuraTakesThenFails(mineBeforeBackup: boolean) {
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const toAnvil = () => anvilFetch(`http://127.0.0.1:${String(ANVIL_PORT)}`, init)
    if (url.startsWith('https://sepolia.infura.io/')) {
      upstreamCalls.push('infura')
      await toAnvil() // the node got the tx
      if (mineBeforeBackup) await ask('evm_mine') // and a block has it before the second upstream is asked
      return new Response('upstream timeout', { status: 504 })
    }
    if (url.startsWith('https://eth-sepolia.g.alchemy.com/')) {
      upstreamCalls.push('alchemy')
      return toAnvil()
    }
    throw new Error('unexpected fetch')
  })
}

describe('resend through /v1/rpc after the first upstream took the tx (anvil)', () => {
  it('still in the pool: the backup says "already imported", the proxy returns that error body, the tx is mined once', async () => {
    await ask('evm_setAutomine', [false]) // the tx stays in the pool until the test mines a block
    const raw = await signed()
    const [n0, before] = [await nonce(), await balanceOfB()]
    infuraTakesThenFails(false)

    const { status, body } = await sendThroughProxy(raw)
    expect(upstreamCalls).toEqual(['infura', 'alchemy']) // one resend, never more
    expect(status).toBe(200)
    expect(body.result).toBeUndefined() // never `null` and never a made-up hash
    expect(body.error).toMatchObject({ code: -32003, message: expect.stringMatching(/already imported/) as string })

    await ask('evm_mine')
    expect((await nonce()) - n0).toBe(1n) // one tx for the nonce
    expect((await balanceOfB()) - before).toBe(1n) // received once
  })

  it('already mined: the backup says "nonce too low", the proxy returns that error body, nothing is sent twice', async () => {
    await ask('evm_setAutomine', [false])
    const raw = await signed()
    const [n0, before] = [await nonce(), await balanceOfB()]
    infuraTakesThenFails(true)

    const { status, body } = await sendThroughProxy(raw)
    expect(upstreamCalls).toEqual(['infura', 'alchemy'])
    expect(status).toBe(200)
    expect(body.result).toBeUndefined()
    expect(body.error).toMatchObject({ code: -32003, message: expect.stringMatching(/nonce too low/) as string })
    expect((await nonce()) - n0).toBe(1n)
    expect((await balanceOfB()) - before).toBe(1n)
  })
})
