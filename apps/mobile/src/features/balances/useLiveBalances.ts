import { formatAmount, type AssetId } from '@vaultme/wallet-core'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { chain } from '@/shared/chain'
import { getAccountAddress } from '@/shared/storage'

/** Real balances of the stored account as display strings (rounded down, never more than owned), re-read when Home regains focus. null = fake mode, no wallet, not loaded yet, or the read failed (loading/error states are #44). */
export function useLiveBalances(): Record<AssetId, string> | null {
  const [b, setB] = useState<Record<AssetId, string> | null>(null)
  useFocusEffect(
    useCallback(() => {
      let address: string | null = null
      try {
        address = getAccountAddress()
      } catch {
        // kv unreadable: show no balance
      }
      if (!chain.broadcasts || !address) return undefined
      let alive = true
      chain.getBalances(address as `0x${string}`).then(
        (r) => alive && setB({ ETH: formatAmount(r.ETH, 'ETH', 'floor'), USDC: formatAmount(r.USDC, 'USDC', 'floor') }),
        () => alive && setB(null),
      )
      return () => {
        alive = false
      }
    }, []),
  )
  return b
}
