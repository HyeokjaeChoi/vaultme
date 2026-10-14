import { fromUnits, type AssetId } from '@vaultme/wallet-core'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { chain } from '@/shared/chain'
import { getAccountAddress } from '@/shared/storage'

/** Real balances (decimal strings) of the stored account, re-read when Home regains focus. null = fake mode, no wallet, not loaded yet, or the read failed (loading/error states are #44). */
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
        (r) => alive && setB({ ETH: fromUnits(r.ETH, 'ETH'), USDC: fromUnits(r.USDC, 'USDC') }),
        () => alive && setB(null),
      )
      return () => {
        alive = false
      }
    }, []),
  )
  return b
}
