import type { webcrypto } from 'node:crypto'
import { createApiClient, isApiError, type DeviceSigner } from '@vaultme/api-client'
import { percentile } from './summarize.ts'

export type Endpoint = 'health' | 'rpc' | 'history'
export type EndpointLatency = { n: number; ok: number; p50Ms: number | null; p95Ms: number | null }
export type ApiLatency = Record<Endpoint, EndpointLatency>

export type LatencyOptions = {
  baseUrl: string
  appVersion: string
  /** Number of timed calls per endpoint. */
  n: Record<Endpoint, number>
  /** Public address whose history is read. */
  address: string
  /** Wait between two history calls: longer than the 30 s page cache of the Worker, so each call reaches Etherscan. */
  historyGapMs: number
  /** Per request; a request that does not answer in time is a failed call. */
  timeoutMs?: number
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

const b64u = (b: ArrayBuffer) => Buffer.from(b).toString('base64url')

/** A throw-away install identity: the key lives in memory, so the install is registered once per run and nothing is stored. */
export function memorySigner(): DeviceSigner {
  let pair: webcrypto.CryptoKeyPair | null = null
  let installId: string | null = null
  const publicKey = async () => (pair ? b64u(await crypto.subtle.exportKey('raw', pair.publicKey)) : null)
  return {
    publicKey,
    async createKey() {
      pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
      return (await publicKey()) ?? ''
    },
    // WebCrypto returns r||s (64 bytes), the form the server verifies.
    async sign(text) {
      if (!pair) throw new Error('no key')
      return b64u(
        await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(text)),
      )
    },
    getInstallId: () => Promise.resolve(installId),
    setInstallId(id) {
      installId = id
      return Promise.resolve()
    },
  }
}

// Only fixed values reach the log: the API error code and status, or the error message of fetch. Never a URL, token or address.
const why = (e: unknown) =>
  isApiError(e) ? `${e.code} (HTTP ${String(e.status)})` : e instanceof Error ? e.message : 'error'

export async function measureApi(o: LatencyOptions): Promise<ApiLatency> {
  const timeoutMs = o.timeoutMs ?? 15_000
  const f: typeof fetch = (input, init) =>
    (o.fetch ?? fetch)(input, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  const now = o.now ?? (() => performance.now())
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const client = createApiClient({
    baseUrl: o.baseUrl,
    appVersion: o.appVersion,
    client: 'web',
    signer: memorySigner(),
    fetch: f,
  })

  async function time(
    name: Endpoint,
    count: number,
    gapMs: number,
    call: () => Promise<unknown>,
  ): Promise<EndpointLatency> {
    const ms: number[] = []
    for (let i = 0; i < count; i++) {
      if (i > 0 && gapMs > 0) await sleep(gapMs)
      const t = now()
      try {
        await call()
        ms.push(Math.round(now() - t))
      } catch (e) {
        // A failed call counts in `n` but not in `ok`; its time is not a latency.
        console.error(`${name} call ${String(i + 1)} of ${String(count)} failed: ${why(e)}`)
      }
    }
    const pct = (p: number) => percentile(ms, p)
    return { n: count, ok: ms.length, p50Ms: pct(50), p95Ms: pct(95) }
  }

  // Registers the install and gets the token (not timed): the timed calls then reuse the cached token.
  await client.rpc('eth_blockNumber')
  return {
    health: await time('health', o.n.health, 0, async () => {
      const res = await f(`${o.baseUrl}/v1/health`)
      if (!res.ok) throw new Error(String(res.status))
      await res.text()
    }),
    rpc: await time('rpc', o.n.rpc, 0, () => client.rpc('eth_blockNumber')),
    history: await time('history', o.n.history, o.historyGapMs, () => client.history(o.address)),
  }
}
