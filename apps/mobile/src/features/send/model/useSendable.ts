import { queryOptions, useQuery } from '@tanstack/react-query'
import { feeCapOf, type Address, type AssetId } from '@vaultme/wallet-core'
import { useCallback } from 'react'
import { chain } from '@/shared/chain'
import type { Sendable } from './limits'
import { sendFrom } from './useReviewCore'

// Gas estimation needs some amount; a transfer costs the same for any value, so a dust amount (1 unit of USDC, 0.000001 ETH) is enough for the send amount step.
const PROBE_AMOUNT = '0.000001'

/**
 * The amount-step snapshot of one sender, recipient and asset (ADR-0021 PR 3). Not persisted (bigint, and a fee cap must be fresh) and dropped with its
 * screen (`gcTime: 0`), so a returning screen starts with no numbers, as before. Re-read only by `refresh`, mount and key change: the app returning to
 * the foreground is `useOnForeground`'s job (only while ETH is short), so the focus and reconnect refetches are off.
 */
export const sendableQuery = (from: Address, to: string, asset: AssetId) =>
  queryOptions({
    queryKey: ['sendable', from, asset, to] as const,
    queryFn: async (): Promise<Sendable> => {
      const snap = await chain.getSnapshot(from, asset, to as Address, PROBE_AMOUNT)
      return {
        balance: asset === 'ETH' ? snap.nativeBalance : snap.tokenBalance,
        nativeBalance: snap.nativeBalance,
        feeCap: feeCapOf(snap),
      }
    },
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: { persist: false },
  })

/** Balance of `asset`, ETH balance and fee cap for the amount step (chips, helper, over-balance check). `sendable` is null while loading or when the network could not be asked: chips stay off and Review's prepare() still checks the funds. */
export function useSendable(to: string, asset: AssetId = 'ETH'): { sendable: Sendable | null; refresh: () => void } {
  // A new recipient or asset is a new query (no numbers until it answers); a refresh keeps the numbers until the new ones arrive, and a failed refresh
  // keeps them (the ETH-short state and the retry on the next return stay).
  const { data, refetch } = useQuery(sendableQuery(sendFrom(), to, asset))
  const refresh = useCallback(() => void refetch(), [refetch])
  return { sendable: data ?? null, refresh }
}
