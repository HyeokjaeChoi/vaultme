import { formatAmount, type AssetId } from '@vaultme/wallet-core'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { chain } from '@/shared/chain'
import { getAccountAddress } from '@/shared/storage'

/**
 * Real balances of the stored account as display strings (rounded down, never more than owned), re-read when Home regains focus. `balances` null = fake mode, no wallet, not loaded yet, or the read failed (loading/error states are #44).
 * `refresh` (pull-to-refresh) re-reads now and resolves when the answer is in.
 */
export function useLiveBalancesState(): { balances: Record<AssetId, string> | null; refresh: () => Promise<void> } {
  const [b, setB] = useState<Record<AssetId, string> | null>(null)
  const alive = useRef(true)
  const seq = useRef(0) // read identity: only the newest read may commit (a focus read and a pull-to-refresh can overlap)
  const read = useCallback(async () => {
    let address: string | null = null
    try {
      address = getAccountAddress()
    } catch {
      // kv unreadable: show no balance
    }
    if (!chain.broadcasts || !address) return
    const mine = ++seq.current
    try {
      const r = await chain.getBalances(address as `0x${string}`)
      if (alive.current && mine === seq.current) setB({ ETH: formatAmount(r.ETH, 'ETH', 'floor'), USDC: formatAmount(r.USDC, 'USDC', 'floor') })
    } catch {
      if (alive.current && mine === seq.current) setB(null)
    }
  }, [])
  useFocusEffect(
    useCallback(() => {
      alive.current = true
      void read()
      return () => {
        alive.current = false
      }
    }, [read]),
  )
  return { balances: b, refresh: read }
}

export const useLiveBalances = () => useLiveBalancesState().balances
