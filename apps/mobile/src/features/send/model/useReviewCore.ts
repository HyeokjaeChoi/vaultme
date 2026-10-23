import { prepare, type AssetId, type PrepareError, type Review } from '@vaultme/wallet-core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { account } from '@/entities/account/fixtures'
import { chain } from '@/shared/chain'
import { getAccountAddress } from '@/shared/storage'

const hhmm = () => new Date().toTimeString().slice(0, 5)

/** Sending account address: the stored one, or the fixture account when no wallet is stored (demo / capture). */
export function sendFrom(): `0x${string}` {
  try {
    return (getAccountAddress() ?? account.address) as `0x${string}`
  } catch {
    return account.address as `0x${string}`
  }
}

export type ReviewCore = {
  review: Review | null
  error: PrepareError | 'chain' | null
  /** What the snapshot call threw, when `error` is 'chain'. */ cause: unknown
  checkedAt: string
  refresh: () => Promise<Review | null>
}

/** Fresh chain snapshot -> wallet-core prepare(). Fee, cap and nonce on Review come from here, never from fixtures. `recentAddresses` = recipients this device sent to (look-alike check). `refresh` re-fetches (다시 계산, and after NeedsReview). */
export function useReviewCore(
  to: string,
  amount: string,
  recentAddresses: readonly string[],
  asset: AssetId = 'ETH',
): ReviewCore {
  const [state, setState] = useState<{
    review: Review | null
    error: PrepareError | 'chain' | null
    cause: unknown
    checkedAt: string
  }>({ review: null, error: null, cause: null, checkedAt: hhmm() })
  const key = recentAddresses.join(',') // compared by value, so a new array of the same addresses does not re-fetch
  const latest = useRef(0) // only the newest request may set the state: two quick refreshes (app returned twice) can finish out of order
  const refresh = useCallback(async () => {
    const mine = ++latest.current
    try {
      const snap = await chain.getSnapshot(sendFrom(), asset, to as `0x${string}`, amount)
      const r = prepare(
        { asset, to: to as `0x${string}`, amount, previous: (key ? key.split(',') : []) as `0x${string}`[] },
        snap,
      )
      if (mine === latest.current)
        setState({ review: r.ok ? r.review : null, error: r.ok ? null : r.error, cause: null, checkedAt: hhmm() })
      return r.ok ? r.review : null
    } catch (cause) {
      if (mine === latest.current) setState({ review: null, error: 'chain', cause, checkedAt: hhmm() })
      return null
    }
  }, [to, amount, key, asset])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return { ...state, refresh }
}
