import { createApiClient, isApiError, readBalances } from '@vaultme/api-client'
import { HistoryResponse, USDC_SEPOLIA } from '@vaultme/contracts'
import { memorySigner } from './latency.ts'

/** Post-deploy check (Q55): a real balance read (JSON-RPC) and a real history read through the signed-install flow, of the public Sepolia USDC contract (not a person's wallet). Throws on non-2xx or a wrong shape. A retryable 503 is tried 3 times. */
export async function smokeApi(o: {
  baseUrl: string
  appVersion: string
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}) {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const client = createApiClient({
    baseUrl: o.baseUrl,
    appVersion: o.appVersion,
    client: 'web',
    signer: memorySigner(),
    fetch: (input, init) => (o.fetch ?? fetch)(input, { ...init, signal: AbortSignal.timeout(20_000) }),
  })
  const retry = async <T>(call: () => Promise<T>): Promise<T> => {
    for (let i = 1; ; i++) {
      try {
        return await call()
      } catch (e) {
        if (i === 3 || !(isApiError(e) && e.retryable)) throw e
        await sleep(2000 * i) // an Etherscan throttle or an RPC upstream blip passes within seconds
      }
    }
  }
  // readBalances throws unless both results are 0x quantities.
  await retry(() => readBalances((m, p) => client.rpc(m, p), USDC_SEPOLIA))
  HistoryResponse.parse(await retry(() => client.history(USDC_SEPOLIA)))
}
