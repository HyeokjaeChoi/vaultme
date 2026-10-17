import { feeCapOf, type Address, type AssetId } from '@vaultme/wallet-core'
import { useEffect, useState } from 'react'
import { chain } from '@/shared/chain'
import type { Sendable } from './limits'
import { sendFrom } from './useReviewCore'

// Gas estimation needs some amount; a transfer costs the same for any value, so a dust amount (1 unit of USDC, 0.000001 ETH) is enough for the send amount step.
const PROBE_AMOUNT = '0.000001'

/** Balance of `asset`, ETH balance and fee cap for the amount step (chips, helper, over-balance check). null while loading or when the network could not be asked: chips stay off and Review's prepare() still checks the funds. */
export function useSendable(to: string, asset: AssetId = 'ETH'): Sendable | null {
  const [s, setS] = useState<Sendable | null>(null)
  useEffect(() => {
    let live = true
    setS(null)
    chain
      .getSnapshot(sendFrom(), asset, to as Address, PROBE_AMOUNT)
      .then((snap) => live && setS({ balance: asset === 'ETH' ? snap.nativeBalance : snap.tokenBalance, nativeBalance: snap.nativeBalance, feeCap: feeCapOf(snap) }), () => live && setS(null))
    return () => {
      live = false
    }
  }, [to, asset])
  return s
}
