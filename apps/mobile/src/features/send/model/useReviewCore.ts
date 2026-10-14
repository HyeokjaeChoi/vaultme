import { prepare, type PrepareError, type Review } from '@vaultme/wallet-core'
import { useCallback, useEffect, useState } from 'react'
import { account } from '@/entities/account/fixtures'
import { recents } from '@/entities/transaction/fixtures'
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

export type ReviewCore = { review: Review | null; error: PrepareError | 'chain' | null; checkedAt: string; refresh: () => Promise<Review | null> }

/** Fresh chain snapshot -> wallet-core prepare(). Fee, cap and nonce on Review come from here, never from fixtures. `refresh` re-fetches (다시 계산, and after NeedsReview). */
export function useReviewCore(to: string, amount: string): ReviewCore {
  const [state, setState] = useState<{ review: Review | null; error: PrepareError | 'chain' | null; checkedAt: string }>({ review: null, error: null, checkedAt: hhmm() })
  const refresh = useCallback(async () => {
    try {
      const snap = await chain.getSnapshot(sendFrom(), 'ETH', to as `0x${string}`, amount)
      const r = prepare({ asset: 'ETH', to: to as `0x${string}`, amount, previous: recents.map((x) => x.address as `0x${string}`) }, snap)
      setState({ review: r.ok ? r.review : null, error: r.ok ? null : r.error, checkedAt: hhmm() })
      return r.ok ? r.review : null
    } catch {
      setState({ review: null, error: 'chain', checkedAt: hhmm() })
      return null
    }
  }, [to, amount])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return { ...state, refresh }
}
