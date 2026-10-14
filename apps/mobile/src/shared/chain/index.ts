import { getFakeNonce, setFakeNonce } from '@/shared/storage'
import { createFakeChain } from './fake'

export type { ChainPort } from './port'
/** The one chain adapter. C3 swaps this line for the real /v1/rpc adapter. */
export const chain = createFakeChain({ get: getFakeNonce, set: setFakeNonce })
