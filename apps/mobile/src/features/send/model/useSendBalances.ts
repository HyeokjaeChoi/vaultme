import { useQuery } from '@tanstack/react-query'
import type { AssetId } from '@vaultme/wallet-core'
import { balancesQuery, fromRaw, type BalancesRaw } from '@/shared/chain'
import { listBalance } from './limits'
import { sendFrom } from './useReviewCore'

const NONE: Record<AssetId, string | null> = { ETH: null, USDC: null }

function toList(raw: BalancesRaw): Record<AssetId, string | null> {
  const b = fromRaw(raw)
  return b ? { ETH: listBalance(b.ETH, 'ETH'), USDC: listBalance(b.USDC, 'USDC') } : NONE
}

/** Both balances of the sending account for the asset sheet, as list strings (2 decimals, floored). null per asset while nothing was read yet or the network could not be asked (the last read stays, TanStack Query cache). */
export function useSendBalances(): Record<AssetId, string | null> {
  return useQuery({ ...balancesQuery(sendFrom()), select: toList }).data ?? NONE
}
