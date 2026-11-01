import { createApiClient, readBalances } from '@vaultme/api-client'
import { memorySigner } from './latency.ts'

// The Sepolia USDC token contract (`USDC_SEPOLIA` in @vaultme/contracts): a public contract, not a person's wallet.
export const SMOKE_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

/** Post-deploy check (Q55): a real balance read (JSON-RPC) and a real history read through the signed-install flow. Throws on non-2xx or a wrong shape. */
export async function smokeApi(o: { baseUrl: string; appVersion: string; fetch?: typeof fetch }) {
  const client = createApiClient({
    baseUrl: o.baseUrl,
    appVersion: o.appVersion,
    client: 'web',
    signer: memorySigner(),
    fetch: (input, init) => (o.fetch ?? fetch)(input, { ...init, signal: AbortSignal.timeout(20_000) }),
  })
  // readBalances throws unless both results are 0x quantities.
  await readBalances((m, p) => client.rpc(m, p), SMOKE_ADDRESS)
  const h = (await client.history(SMOKE_ADDRESS)) as { items?: unknown; nextCursor?: unknown; incomplete?: unknown }
  if (
    !Array.isArray(h.items) ||
    !(h.nextCursor === null || typeof h.nextCursor === 'string') ||
    typeof h.incomplete !== 'boolean'
  )
    throw new Error('history: unexpected shape')
}
