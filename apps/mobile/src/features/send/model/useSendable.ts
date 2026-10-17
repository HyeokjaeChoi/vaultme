import { feeCapOf, type Address } from '@vaultme/wallet-core'
import { useEffect, useState } from 'react'
import { chain } from '@/shared/chain'
import { sendFrom } from './useReviewCore'

export type Sendable = { balance: bigint; nativeBalance: bigint; feeCap: bigint }

// Gas estimation needs some amount; an ETH transfer costs the same for any value, so a dust amount is enough for the send amount step.
const PROBE_AMOUNT = '0.000001'

/** ETH balance and fee cap for the amount step (chips, helper, over-balance check). null while loading or when the network could not be asked: chips stay off and Review's prepare() still checks the funds. */
export function useSendable(to: string): Sendable | null {
  const [s, setS] = useState<Sendable | null>(null)
  useEffect(() => {
    let live = true
    chain
      .getSnapshot(sendFrom(), 'ETH', to as Address, PROBE_AMOUNT)
      .then((snap) => live && setS({ balance: snap.nativeBalance, nativeBalance: snap.nativeBalance, feeCap: feeCapOf(snap) }), () => live && setS(null))
    return () => {
      live = false
    }
  }, [to])
  return s
}
