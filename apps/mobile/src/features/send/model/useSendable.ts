import { feeCapOf, type Address, type AssetId } from '@vaultme/wallet-core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { chain } from '@/shared/chain'
import type { Sendable } from './limits'
import { sendFrom } from './useReviewCore'

// Gas estimation needs some amount; a transfer costs the same for any value, so a dust amount (1 unit of USDC, 0.000001 ETH) is enough for the send amount step.
const PROBE_AMOUNT = '0.000001'

/** Balance of `asset`, ETH balance and fee cap for the amount step (chips, helper, over-balance check). `sendable` is null while loading or when the network could not be asked: chips stay off and Review's prepare() still checks the funds. */
export function useSendable(to: string, asset: AssetId = 'ETH'): { sendable: Sendable | null; refresh: () => void } {
  const [s, setS] = useState<Sendable | null>(null)
  const [tick, setTick] = useState(0)
  // A new recipient or asset clears the old numbers during render; a refresh keeps them until the new ones arrive (chips do not flicker).
  const k = `${to}|${asset}`
  const [shownKey, setShownKey] = useState(k)
  if (shownKey !== k) {
    setShownKey(k)
    setS(null)
  }
  const key = useRef('')
  useEffect(() => {
    let live = true
    const fresh = key.current !== k
    key.current = k
    chain.getSnapshot(sendFrom(), asset, to as Address, PROBE_AMOUNT).then(
      (snap) =>
        live &&
        setS({
          balance: asset === 'ETH' ? snap.nativeBalance : snap.tokenBalance,
          nativeBalance: snap.nativeBalance,
          feeCap: feeCapOf(snap),
        }),
      () => live && fresh && setS(null),
    ) // a failed refresh keeps the last numbers, so the ETH-short state (and the retry on the next return) stays
    return () => {
      live = false
    }
  }, [k, to, asset, tick])
  const refresh = useCallback(() => setTick((n) => n + 1), [])
  return { sendable: s, refresh }
}
