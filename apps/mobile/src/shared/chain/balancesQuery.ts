import { queryOptions } from '@tanstack/react-query'
import { chain } from './adapter'
import { balancesKey, toRaw } from './balancesData'

/** The one balance read (ETH and USDC of `address`), shared by every screen that shows a balance. */
export const balancesQuery = (address: `0x${string}`) =>
  queryOptions({
    queryKey: balancesKey(address),
    queryFn: async () => toRaw(await chain.getBalances(address)),
    meta: { persist: chain.broadcasts }, // fake-chain fixtures must not be stored as this wallet's balance (shared/query/persist.ts)
  })
