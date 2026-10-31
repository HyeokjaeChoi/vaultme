import { queryOptions, useQuery } from '@tanstack/react-query'
import { prepare, type Address, type AssetId, type PrepareError, type Review } from '@vaultme/wallet-core'
import { useCallback, useState } from 'react'
import { account } from '@/entities/account'
import { chain } from '@/shared/chain'
import { getAccountAddress } from '@/shared/storage'

const hhmm = () => new Date().toTimeString().slice(0, 5)

/** Sending account address: the stored one, or the fixture account when no wallet is stored (demo / capture). */
export function sendFrom(): `0x${string}` {
  try {
    return (getAccountAddress() ?? account.address) as `0x${string}`
  } catch {
    return account.address
  }
}

export type ReviewCore = {
  review: Review | null
  error: PrepareError | 'chain' | null
  /** What the snapshot call threw, when `error` is 'chain'. */ cause: unknown
  checkedAt: string
  refresh: () => Promise<Review | null>
}

type Core = Pick<ReviewCore, 'review' | 'error' | 'cause' | 'checkedAt'>

/**
 * One review read: fresh snapshot -> wallet-core prepare(). A failed snapshot is data (`error: 'chain'`, no review), not a query error: the old review
 * must never stay on screen after a failed re-read (a signed tx must match the reviewed one), and the notice stays while the next read runs.
 * Never persisted; `gcTime: 0` drops it with its screen, so a returning Review starts with no review (fee, cap and nonce are never old). Re-read only
 * by `refresh`, mount and key change (no focus or reconnect refetch: `useOnForeground` re-reads while ETH is short).
 */
export const reviewQuery = (from: Address, to: string, amount: string, asset: AssetId, previous: readonly string[]) =>
  queryOptions({
    queryKey: ['review', from, asset, to, amount, previous.join(',')] as const, // by value: a new array of the same addresses does not re-read
    queryFn: async (): Promise<Core> => {
      try {
        const snap = await chain.getSnapshot(from, asset, to as Address, amount)
        const r = prepare({ asset, to: to as Address, amount, previous: previous as Address[] }, snap)
        return { review: r.ok ? r.review : null, error: r.ok ? null : r.error, cause: null, checkedAt: hhmm() }
      } catch (cause) {
        return { review: null, error: 'chain', cause, checkedAt: hhmm() }
      }
    },
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: { persist: false },
  })

/** Fresh chain snapshot -> wallet-core prepare(). Fee, cap and nonce on Review come from here, never from fixtures. `recentAddresses` = recipients this device sent to (look-alike check). `refresh` re-fetches (다시 계산, and after NeedsReview). */
export function useReviewCore(
  to: string,
  amount: string,
  recentAddresses: readonly string[],
  asset: AssetId = 'ETH',
): ReviewCore {
  const [openedAt] = useState(hhmm)
  const { data, refetch } = useQuery(reviewQuery(sendFrom(), to, amount, asset, recentAddresses))
  // `cancelRefetch: false`: a refresh that finds a read running waits for that read and returns its answer (two quick refreshes, app returned twice).
  // The default would cancel the first read and let its caller get the old review as the result.
  const refresh = useCallback(async () => (await refetch({ cancelRefetch: false })).data?.review ?? null, [refetch])
  return { review: null, error: null, cause: null, checkedAt: openedAt, ...data, refresh }
}
