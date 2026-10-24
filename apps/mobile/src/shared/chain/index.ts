import { api } from '@/shared/api'
import { getFakeNonce, setFakeNonce } from '@/shared/storage'
import { createFakeChain } from './fake'
import type { ChainPort } from './port'
import { createRpcChain } from './real'

export type { ChainPort } from './port'

function pick(): ChainPort {
  if (!api) return createFakeChain({ get: getFakeNonce, set: setFakeNonce })
  const client = api
  return createRpcChain((m, p) => client.rpc(m, p))
}

/** The one chain adapter: real `/v1/rpc` when `EXPO_PUBLIC_API_URL` is set, the fake one otherwise. */
export const chain: ChainPort = pick()
export { explorerUrl } from './port'
export type { Receipt } from './port'
export { useDevEthShort } from './useDevEthShort'
export { useTestMode } from './useTestMode'
export { assets } from './fixtures'
