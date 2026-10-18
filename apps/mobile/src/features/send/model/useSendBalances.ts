import type { AssetId } from '@vaultme/wallet-core'
import { useEffect, useState } from 'react'
import { chain } from '@/shared/chain'
import { listBalance } from './limits'
import { sendFrom } from './useReviewCore'

/** Both balances of the sending account for the asset sheet, as list strings (2 decimals, floored). null per asset while loading or when the network could not be asked. */
export function useSendBalances(): Record<AssetId, string | null> {
  const [b, setB] = useState<Record<AssetId, string | null>>({ ETH: null, USDC: null })
  useEffect(() => {
    let live = true
    chain.getBalances(sendFrom()).then(
      (r) => live && setB({ ETH: listBalance(r.ETH, 'ETH'), USDC: listBalance(r.USDC, 'USDC') }),
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [])
  return b
}
